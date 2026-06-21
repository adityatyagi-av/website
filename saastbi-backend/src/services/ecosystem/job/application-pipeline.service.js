import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";
import sendMail from "../../../config/sendMail.js";
import path from "path";
import { NotificationService } from "../../common/notification.service.js";

async function validatePageJobPermission(pageId, userId) {
  const member = await db.pageMember.findFirst({
    where: { pageId, userId },
    select: { role: true },
  });
  if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
    throw new ApiError(403, "You don't have permission to manage applications");
  }
}

async function validatePageMembership(pageId, userId) {
  const member = await db.pageMember.findFirst({
    where: { pageId, userId },
    select: { role: true },
  });
  if (!member) {
    throw new ApiError(403, "You must be a page member to perform this action");
  }
  return member;
}

const applicantSummaryInclude = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    username: true,
    profilePhoto: true,
    headline: true,
    email: true,
  },
};

export const ApplicationPipelineService = {
  getApplications: async (userId, jobId, query) => {
    const job = await db.job.findUnique({ where: { id: jobId }, select: { id: true, pageId: true } });
    if (!job) throw new ApiError(404, "Job not found");
    if (!job.pageId) throw new ApiError(400, "Job is not associated with a page");
    await validatePageJobPermission(job.pageId, userId);

    const { skip, take, orderBy } = buildQueryOptions({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy || "appliedAt",
      order: query.order || "desc",
    });

    const filters = { jobId };
    if (query.status) filters.status = query.status;
    if (query.minScore) filters.matchScore = { gte: Number(query.minScore) };
    if (query.source) filters.source = query.source;

    if (query.search) {
      filters.user = {
        OR: [
          { firstName: { contains: query.search, mode: "insensitive" } },
          { lastName: { contains: query.search, mode: "insensitive" } },
          { email: { contains: query.search, mode: "insensitive" } },
        ],
      };
    }

    const [applications, total] = await Promise.all([
      db.jobApplication.findMany({
        where: filters,
        skip,
        take,
        orderBy: query.sortBy === "matchScore" ? { matchScore: "desc" } : orderBy,
        include: {
          user: applicantSummaryInclude,
          referral: { select: { id: true, referrer: { select: { firstName: true, lastName: true } } } },
          _count: { select: { applicationNotes: true, ratings: true } },
        },
      }),
      db.jobApplication.count({ where: filters }),
    ]);

    return { applications, total, page: Number(query.page) || 1, limit: take };
  },

  getApplicationDetail: async (userId, applicationId) => {
    const application = await db.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        job: { select: { id: true, pageId: true, title: true } },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            profilePhoto: true,
            coverImage: true,
            headline: true,
            bio: true,
            email: true,
            phone: true,
            location: true,
            skills: { include: { skill: true } },
            experiences: { orderBy: { startDate: "desc" } },
            educations: { orderBy: { startDate: "desc" } },
            certifications: { orderBy: { issueDate: "desc" } },
            projects: true,
            socialLinks: true,
          },
        },
        screeningAnswers: {
          include: { question: true },
          orderBy: { question: { orderIndex: "asc" } },
        },
        timeline: {
          orderBy: { createdAt: "asc" },
          include: { changedBy: { select: { firstName: true, lastName: true } } },
        },
        applicationNotes: {
          orderBy: { createdAt: "desc" },
          include: { author: { select: { firstName: true, lastName: true, profilePhoto: true } } },
        },
        ratings: {
          include: { rater: { select: { firstName: true, lastName: true, profilePhoto: true } } },
        },
        referral: {
          select: {
            id: true,
            note: true,
            referrer: { select: { firstName: true, lastName: true, profilePhoto: true } },
          },
        },
      },
    });

    if (!application) throw new ApiError(404, "Application not found");
    if (!application.job.pageId) throw new ApiError(400, "Job is not associated with a page");
    await validatePageJobPermission(application.job.pageId, userId);

    return application;
  },

  changeApplicationStatus: async (userId, applicationId, newStatus, note) => {
    const application = await db.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        job: { select: { id: true, pageId: true, title: true, page: { select: { name: true } } } },
        user: { select: { id: true,email: true, firstName: true } },
      },
    });

    if (!application) throw new ApiError(404, "Application not found");
    if (!application.job.pageId) throw new ApiError(400, "Job is not associated with a page");
    await validatePageJobPermission(application.job.pageId, userId);

    const validTransitions = {
      APPLIED: ["VIEWED", "SCREENING", "INTERVIEWING", "OFFERED", "REJECTED"],
      VIEWED: ["SCREENING", "INTERVIEWING", "OFFERED", "REJECTED"],
      SCREENING: ["INTERVIEWING", "OFFERED", "REJECTED"],
      INTERVIEWING: ["OFFERED", "REJECTED"],
      OFFERED: ["HIRED", "REJECTED"],
      HIRED: [],
      REJECTED: [],
      WITHDRAWN: [],
    };

    if (!validTransitions[application.status]?.includes(newStatus)) {
      throw new ApiError(400, `Cannot transition from ${application.status} to ${newStatus}`);
    }

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.jobApplication.update({
        where: { id: applicationId },
        data: { status: newStatus, reviewedAt: new Date() },
      });

      await tx.applicationTimeline.create({
        data: {
          applicationId,
          fromStatus: application.status,
          toStatus: newStatus,
          changedById: userId,
          note: note || null,
        },
      });

      return result;
    });

    try {
      await sendMail(
        application.user.email,
        `Application Update - ${application.job.title}`,
        path.resolve("src/mails/job-application-status-update.ejs"),
        {
          userName: application.user.firstName,
          jobTitle: application.job.title,
          companyName: application.job.page?.name || "Company",
          oldStatus: application.status,
          newStatus,
          note: note || null,
        }
      );
    } catch (_) {}

    const actor =
      await db.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
        },
      });

      let title;
      let message;
      
      switch (newStatus) {
        case "VIEWED":
          title = "Application Viewed";
          message = `Your application for ${application.job.title} has been viewed by the hiring team.`;
          break;
      
        case "SCREENING":
          title = "Application Under Review";
          message = `Your application for ${application.job.title} has progressed to the screening stage.`;
          break;
      
        case "INTERVIEWING":
          title = "Interview Shortlisted";
          message = `Congratulations! You've been shortlisted for an interview for ${application.job.title}.`;
          break;
      
        case "OFFERED":
          title = "Job Offer Received 🎉";
          message = `Congratulations! You've received a job offer for ${application.job.title}.`;
          break;
      
        case "HIRED":
          title = "You're Hired! 🎉";
          message = `Congratulations! You've been selected for ${application.job.title}. Welcome aboard!`;
          break;
      
        case "REJECTED":
          title = "Application Update";
          message = `Your application for ${application.job.title} was not selected. We encourage you to apply for other opportunities.`;
          break;
      
        default:
          title = "Application Status Updated";
          message = `Your application for ${application.job.title} has been updated to ${newStatus}.`;
      }

    await NotificationService.send({
      recipientId:
        application.user.id,
      type:
        "JOB_APPLICATION_UPDATE",
      category:
        "JOB",
      priority:
        [
          "OFFERED",
          "HIRED",
          "REJECTED",
        ].includes(newStatus)
          ? "HIGH"
          : "MEDIUM",
      title,
      message,
      actionUrl:
        `/manage`,
      actorId:
        actor?.id || null,
      actorName:
        `${actor?.firstName || ""} ${actor?.lastName || ""}`.trim() || null,
      actorAvatar:
        actor?.profilePhoto || null,
      entityType:
        "JobApplication",
      entityId:
        applicationId,
      data: {
        applicationId,
        jobId:
          application.job.id,
        oldStatus:
          application.status,
        newStatus,
        note:
          note || null,
      },
    }).catch(() => {});
    return updated;
  },

  bulkStatusChange: async (userId, jobId, applicationIds, newStatus, note) => {
    const job = await db.job.findUnique({ where: { id: jobId }, select: { id: true, pageId: true, title: true, page: { select: { name: true } } } });
    if (!job) throw new ApiError(404, "Job not found");
    if (!job.pageId) throw new ApiError(400, "Job is not associated with a page");
    await validatePageJobPermission(job.pageId, userId);

    const applications = await db.jobApplication.findMany({
      where: { id: { in: applicationIds }, jobId },
      include: { user: { select: { email: true, firstName: true } } },
    });

    if (applications.length !== applicationIds.length) {
      throw new ApiError(400, "Some applications do not belong to this job");
    }

    await db.$transaction(async (tx) => {
      for (const app of applications) {
        await tx.jobApplication.update({
          where: { id: app.id },
          data: { status: newStatus, reviewedAt: new Date() },
        });
        await tx.applicationTimeline.create({
          data: {
            applicationId: app.id,
            fromStatus: app.status,
            toStatus: newStatus,
            changedById: userId,
            note: note || "Bulk status change",
          },
        });
      }
    });

    for (const app of applications) {
      try {
        await sendMail(
          app.user.email,
          `Application Update - ${job.title}`,
          path.resolve("src/mails/job-application-status-update.ejs"),
          {
            userName: app.user.firstName,
            jobTitle: job.title,
            companyName: job.page?.name || "Company",
            oldStatus: app.status,
            newStatus,
            note: note || null,
          }
        );
      } catch (_) {}
    }

    return { updated: applications.length };
  },

  addNote: async (userId, applicationId, content, isPrivate) => {
    const application = await db.jobApplication.findUnique({
      where: { id: applicationId },
      include: { job: { select: { pageId: true } } },
    });
    if (!application) throw new ApiError(404, "Application not found");
    if (!application.job.pageId) throw new ApiError(400, "Job is not associated with a page");
    await validatePageMembership(application.job.pageId, userId);

    const appNote = await db.applicationNote.create({
      data: {
        applicationId,
        authorId: userId,
        content,
        isPrivate: isPrivate ?? false,
      },
      include: { author: { select: { firstName: true, lastName: true, profilePhoto: true } } },
    });

    return appNote;
  },

  rateApplication: async (userId, applicationId, score, comment) => {
    const application = await db.jobApplication.findUnique({
      where: { id: applicationId },
      include: { job: { select: { pageId: true } } },
    });
    if (!application) throw new ApiError(404, "Application not found");
    if (!application.job.pageId) throw new ApiError(400, "Job is not associated with a page");
    await validatePageMembership(application.job.pageId, userId);

    if (score < 1 || score > 5) throw new ApiError(400, "Score must be between 1 and 5");

    const rating = await db.applicationRating.upsert({
      where: { applicationId_raterId: { applicationId, raterId: userId } },
      create: { applicationId, raterId: userId, score, comment },
      update: { score, comment },
      include: { rater: { select: { firstName: true, lastName: true, profilePhoto: true } } },
    });

    return rating;
  },

  getApplicantProfile: async (userId, applicantId) => {
    const hasAccess = await db.jobApplication.findFirst({
      where: {
        userId: applicantId,
        job: {
          page: {
            members: { some: { userId } },
          },
        },
      },
      select: { id: true },
    });

    if (!hasAccess) {
      throw new ApiError(403, "You don't have permission to view this applicant's profile");
    }

    const profile = await db.user.findUnique({
      where: { id: applicantId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        profilePhoto: true,
        coverImage: true,
        headline: true,
        bio: true,
        email: true,
        phone: true,
        location: true,
        socialLinks: true,
        skills: { include: { skill: true } },
        experiences: { orderBy: { startDate: "desc" } },
        educations: { orderBy: { startDate: "desc" } },
        certifications: { orderBy: { issueDate: "desc" } },
        projects: true,
      },
    });

    if (!profile) throw new ApiError(404, "User not found");
    return profile;
  },

  exportApplications: async (userId, jobId, query) => {
    const job = await db.job.findUnique({ where: { id: jobId }, select: { id: true, pageId: true, title: true } });
    if (!job) throw new ApiError(404, "Job not found");
    if (!job.pageId) throw new ApiError(400, "Job is not associated with a page");
    await validatePageJobPermission(job.pageId, userId);

    const filters = { jobId };
    if (query.status) filters.status = query.status;

    const applications = await db.jobApplication.findMany({
      where: filters,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            headline: true,
            location: { select: { city: true, state: true, country: true } },
          },
        },
        screeningAnswers: { include: { question: { select: { questionText: true } } } },
        ratings: { select: { score: true } },
      },
      orderBy: { appliedAt: "desc" },
    });

    return {
      jobTitle: job.title,
      exportedAt: new Date().toISOString(),
      total: applications.length,
      applications: applications.map((app) => ({
        applicantName: `${app.user.firstName} ${app.user.lastName}`,
        email: app.user.email,
        phone: app.user.phone,
        headline: app.user.headline,
        location: app.user.location
          ? [app.user.location.city, app.user.location.state, app.user.location.country].filter(Boolean).join(", ")
          : null,
        status: app.status,
        matchScore: app.matchScore,
        screeningScore: app.screeningScore,
        source: app.source,
        appliedAt: app.appliedAt,
        resumeUrl: app.resumeUrl,
        portfolioUrl: app.portfolioUrl,
        coverLetter: app.coverLetter,
        expectedSalary: app.expectedSalary,
        noticePeriod: app.noticePeriod,
        currentlyEmployed: app.currentlyEmployed,
        averageRating: app.ratings.length > 0
          ? (app.ratings.reduce((sum, r) => sum + r.score, 0) / app.ratings.length).toFixed(1)
          : null,
        screeningAnswers: app.screeningAnswers.map((sa) => ({
          question: sa.question.questionText,
          answer: sa.answer,
        })),
      })),
    };
  },
};
