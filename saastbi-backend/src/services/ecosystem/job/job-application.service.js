import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";
import { JobDiscoveryService } from "./job-discovery.service.js";
import { JobScreeningService } from "./job-screening.service.js";
import { NotificationService } from "../../common/notification.service.js";
import sendMail from "../../../config/sendMail.js";
import path from "path";
import { JobApplicationStatus } from "@prisma/client";
const ACTIVE_STATUSES = [
  JobApplicationStatus.APPLIED,
  JobApplicationStatus.VIEWED,
  JobApplicationStatus.SCREENING,
  JobApplicationStatus.INTERVIEWING,
];

const OFFER_STATUSES = [JobApplicationStatus.OFFERED];

const COMPLETED_STATUSES = [
  JobApplicationStatus.HIRED,
  JobApplicationStatus.REJECTED,
  JobApplicationStatus.WITHDRAWN,
];

export const JobApplicationService = {
  applyForJob: async (userId, jobId, data) => {
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: {
        page: { select: { name: true } },
        screeningQuestions: {
          where: { isRequired: true },
          select: { id: true },
        },
        hiringManager: { select: { email: true, firstName: true } },
      },
    });

    if (!job) throw new ApiError(404, "Job not found");
    if (job.status !== "OPEN")
      throw new ApiError(400, "This job is no longer accepting applications");
    if (job.deadline && new Date(job.deadline) < new Date()) {
      throw new ApiError(400, "Application deadline has passed");
    }
    if (job.applicationLimit && job.applicationCount >= job.applicationLimit) {
      throw new ApiError(400, "This job has reached its application limit");
    }

    const existing = await db.jobApplication.findUnique({
      where: { jobId_userId: { jobId, userId } },
      select: { id: true },
    });
    if (existing)
      throw new ApiError(409, "You have already applied for this job");

    if (job.screeningQuestions.length > 0 && data.screeningAnswers) {
      const requiredIds = new Set(job.screeningQuestions.map((q) => q.id));
      const answeredIds = new Set(
        data.screeningAnswers.map((a) => a.questionId),
      );
      for (const reqId of requiredIds) {
        if (!answeredIds.has(reqId)) {
          throw new ApiError(
            400,
            "All required screening questions must be answered",
          );
        }
      }
    }

    let matchScore = null;
    try {
      const userProfile = await db.user.findUnique({
        where: { id: userId },
        select: {
          skills: { include: { skill: true } },
          experiences: { orderBy: { startDate: "desc" } },
          educations: true,
          location: true,
        },
      });
      if (userProfile) {
        const result = JobDiscoveryService.computeMatchScore(userProfile, job);
        matchScore = result.totalScore;
      }
    } catch (_) {}

    let referralId = null;
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });
    if (user) {
      const referral = await db.jobReferral.findFirst({
        where: { jobId, referredEmail: user.email, status: "PENDING" },
        select: { id: true },
      });
      if (referral) {
        referralId = referral.id;
        await db.jobReferral.update({
          where: { id: referral.id },
          data: { status: "APPLIED", referredUserId: userId },
        });
      }
    }

    const application = await db.$transaction(async (tx) => {
      const app = await tx.jobApplication.create({
        data: {
          jobId,
          userId,
          resumeUrl: data.resumeUrl,
          coverLetter: data.coverLetter,
          portfolioUrl: data.portfolioUrl,
          matchScore,
          source: referralId ? "REFERRAL" : data.source || "DIRECT",
          referralId,
          expectedSalary: data.expectedSalary,
          noticePeriod: data.noticePeriod,
          currentlyEmployed: data.currentlyEmployed,
        },
      });

      if (data.screeningAnswers && data.screeningAnswers.length > 0) {
        await tx.jobScreeningAnswer.createMany({
          data: data.screeningAnswers.map((a) => ({
            applicationId: app.id,
            questionId: a.questionId,
            answer: a.answer,
          })),
        });
      }

      await tx.applicationTimeline.create({
        data: {
          applicationId: app.id,
          fromStatus: null,
          toStatus: "APPLIED",
          changedById: userId,
          note: "Application submitted",
        },
      });

      await tx.job.update({
        where: { id: jobId },
        data: { applicationCount: { increment: 1 } },
      });

      return app;
    });

    try {
      await JobScreeningService.evaluateScreeningAnswers(application.id);
    } catch (_) {}

    try {
      await sendMail(
        user.email,
        `Application Confirmed - ${job.title}`,
        path.resolve("src/mails/job-application-confirmation.ejs"),
        {
          userName: user.firstName,
          jobTitle: job.title,
          companyName: job.page?.name || "Company",
          appliedAt: new Date().toLocaleDateString(),
          matchScore,
        },
      );
    } catch (_) {}

    if (job.hiringManager?.email) {
      try {
        await sendMail(
          job.hiringManager.email,
          `New Application - ${job.title}`,
          path.resolve("src/mails/job-new-application.ejs"),
          {
            applicantName: user.firstName,
            applicantHeadline: null,
            jobTitle: job.title,
            matchScore,
            screeningScore: null,
          },
        );
      } catch (_) {}
    }

    // Notify hiring manager about new application
    if (job.hiringManagerId) {
      NotificationService.send({
        recipientId: job.hiringManagerId,
        type: "JOB_NEW_APPLICATION",
        category: "JOB",
        title: "New job application",
        message: `has applied for the ${job.title} position.`,
        actionUrl: `/manage`,
        actorId: userId,
        actorName: user?.firstName || null,
        entityType: "JobApplication",
        entityId: application.id,
      }).catch(() => {});
    }

    return { ...application, matchScore };
  },

  withdrawApplication: async (userId, applicationId) => {
    const application = await db.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          select: { id: true, title: true, page: { select: { name: true } } },
        },
      },
    });

    if (!application) throw new ApiError(404, "Application not found");
    if (application.userId !== userId)
      throw new ApiError(403, "You can only withdraw your own application");
    if (["HIRED", "REJECTED", "WITHDRAWN"].includes(application.status)) {
      throw new ApiError(
        400,
        `Cannot withdraw application with status ${application.status}`,
      );
    }

    await db.$transaction(async (tx) => {
      await tx.jobApplication.update({
        where: { id: applicationId },
        data: { status: "WITHDRAWN" },
      });

      await tx.applicationTimeline.create({
        data: {
          applicationId,
          fromStatus: application.status,
          toStatus: "WITHDRAWN",
          changedById: userId,
          note: "Application withdrawn by applicant",
        },
      });

      await tx.job.update({
        where: { id: application.jobId },
        data: { applicationCount: { decrement: 1 } },
      });
    });

    return { message: "Application withdrawn successfully" };
  },

  getMyApplications: async (userId, query) => {
    const { skip, take, orderBy } = buildQueryOptions({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy || "appliedAt",
      order: query.order || "desc",
    });

    const filters = { userId };
    if (query.status) {
      const statuses = query.status.split(",");
      filters.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    }

    if (query.search) {
      filters.job = {
        OR: [
          { title: { contains: query.search, mode: "insensitive" } },
          { page: { name: { contains: query.search, mode: "insensitive" } } },
        ],
      };
    }

    const [applications, total] = await Promise.all([
      db.jobApplication.findMany({
        where: filters,
        skip,
        take,
        orderBy,
        include: {
          job: {
            select: {
              id: true,
              title: true,
              slug: true,
              jobType: true,
              workMode: true,
              experienceLevel: true,
              location: true,
              status: true,
              salaryMin: true,
              salaryMax: true,
              currency: true,
              salaryPeriod: true,
              showSalary: true,
              page: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  logo: true,
                  type: true,
                },
              },
            },
          },
          _count: { select: { timeline: true } },
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
        job: {
          select: {
            id: true,
            title: true,
            slug: true,
            jobType: true,
            workMode: true,
            experienceLevel: true,
            location: true,
            status: true,
            page: { select: { id: true, name: true, slug: true, logo: true } },
          },
        },
        screeningAnswers: {
          include: {
            question: { select: { questionText: true, questionType: true } },
          },
          orderBy: { question: { orderIndex: "asc" } },
        },
        timeline: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!application) throw new ApiError(404, "Application not found");
    if (application.userId !== userId)
      throw new ApiError(403, "You can only view your own application");

    return application;
  },

  getSkillGapAnalysis: async (userId, jobId) => {
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        requiredSkills: true,
        niceToHaveSkills: true,
        skills: true,
        title: true,
      },
    });
    if (!job) throw new ApiError(404, "Job not found");

    const userSkills = await db.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    const userSkillNames = userSkills.map((s) => s.skill.name.toLowerCase());
    const userSkillMap = {};
    for (const us of userSkills) {
      userSkillMap[us.skill.name.toLowerCase()] = {
        name: us.skill.name,
        proficiency: us.proficiency,
        yearsUsed: us.yearsUsed,
      };
    }

    const required =
      job.requiredSkills.length > 0 ? job.requiredSkills : job.skills;
    const niceToHave = job.niceToHaveSkills;

    const matchedRequired = [];
    const missingRequired = [];
    for (const skill of required) {
      if (userSkillNames.includes(skill.toLowerCase())) {
        matchedRequired.push({ skill, ...userSkillMap[skill.toLowerCase()] });
      } else {
        missingRequired.push(skill);
      }
    }

    const matchedNiceToHave = [];
    const missingNiceToHave = [];
    for (const skill of niceToHave) {
      if (userSkillNames.includes(skill.toLowerCase())) {
        matchedNiceToHave.push({ skill, ...userSkillMap[skill.toLowerCase()] });
      } else {
        missingNiceToHave.push(skill);
      }
    }

    const totalRequired = required.length || 1;
    const readinessPercentage = Math.round(
      (matchedRequired.length / totalRequired) * 100,
    );

    return {
      jobTitle: job.title,
      readinessPercentage,
      required: {
        matched: matchedRequired,
        missing: missingRequired,
        total: required.length,
      },
      niceToHave: {
        matched: matchedNiceToHave,
        missing: missingNiceToHave,
        total: niceToHave.length,
      },
      prioritizedLearning: missingRequired.slice(0, 5),
    };
  },

  getApplicationInsights: async (userId, applicationId) => {
    const application = await db.jobApplication.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        userId: true,
        jobId: true,
        matchScore: true,
        appliedAt: true,
        status: true,
      },
    });

    if (!application) throw new ApiError(404, "Application not found");
    if (application.userId !== userId)
      throw new ApiError(
        403,
        "You can only view your own application insights",
      );

    const [allApps, statusBreakdown, avgScoreResult] = await Promise.all([
      db.jobApplication.count({ where: { jobId: application.jobId } }),
      db.jobApplication.groupBy({
        by: ["status"],
        where: { jobId: application.jobId },
        _count: { status: true },
      }),
      db.jobApplication.aggregate({
        where: { jobId: application.jobId, matchScore: { not: null } },
        _avg: { matchScore: true },
      }),
    ]);

    const firstResponse = await db.applicationTimeline.findFirst({
      where: {
        applicationId: application.id,
        fromStatus: "APPLIED",
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });

    const daysSinceApplied = Math.floor(
      (Date.now() - new Date(application.appliedAt).getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return {
      yourMatchScore: application.matchScore,
      averageMatchScore: avgScoreResult._avg.matchScore
        ? Math.round(avgScoreResult._avg.matchScore)
        : null,
      totalApplicants: allApps,
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        count: s._count.status,
      })),
      daysSinceApplied,
      responseTime: firstResponse
        ? Math.floor(
            (new Date(firstResponse.createdAt).getTime() -
              new Date(application.appliedAt).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : null,
      currentStatus: application.status,
    };
  },

  getJobDashboard: async (userId) => {
    const [activeApplications, offers, completed, totalApplications] =
      await Promise.all([
        db.jobApplication.count({
          where: {
            userId,
            status: {
              in: ACTIVE_STATUSES,
            },
          },
        }),

        db.jobApplication.count({
          where: {
            userId,
            status: {
              in: OFFER_STATUSES,
            },
          },
        }),

        db.jobApplication.count({
          where: {
            userId,
            status: {
              in: COMPLETED_STATUSES,
            },
          },
        }),

        db.jobApplication.count({
          where: {
            userId,
          },
        }),
      ]);

    return {
      summary: {
        activeApplications,
        offers,
        completed,
        totalApplications,
      },
    };
  },
};
