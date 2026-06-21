import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";
import { NotificationService } from "../../common/notification.service.js";

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 80);
}

async function ensureUniqueSlug(baseSlug) {
  let slug = baseSlug;
  let counter = 0;
  while (true) {
    const exists = await db.job.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) return slug;
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

async function validatePageJobPermission(pageId, userId, allowedRoles = ["OWNER", "ADMIN"]) {
  const page = await db.page.findUnique({
    where: { id: pageId },
    select: { id: true, isActive: true },
  });
  if (!page) throw new ApiError(404, "Page not found");
  if (!page.isActive) throw new ApiError(400, "Page is not active");
  const member = await db.pageMember.findFirst({
    where: { pageId, userId },
    select: { role: true },
  });
  if (!member || !allowedRoles.includes(member.role)) {
    throw new ApiError(403, "You don't have permission to manage jobs for this page");
  }
  return member;
}

async function recalculatePageJobCounters(tx, pageId) {
  const openCount = await tx.job.count({
    where: { pageId, status: "OPEN" },
  });
  await tx.page.update({
    where: { id: pageId },
    data: { openPositions: openCount, isHiring: openCount > 0 },
  });
}

const pageInclude = {
  select: {
    id: true,
    name: true,
    slug: true,
    logo: true,
    type: true,
    teamSize: true,
    sector: true,
  },
};

const hiringManagerInclude = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    username: true,
    profilePhoto: true,
    headline: true,
  },
};

const jobCardInclude = {
  page: pageInclude,
  category: { select: { id: true, name: true, slug: true } },
  hiringManager: hiringManagerInclude,
  _count: {
    select: {
      applications: true,
      bookmarks: true,
      screeningQuestions: true,
    },
  },
};

const jobDetailInclude = {
  page: pageInclude,
  category: { select: { id: true, name: true, slug: true, parent: { select: { id: true, name: true, slug: true } } } },
  hiringManager: hiringManagerInclude,
  postedBy: hiringManagerInclude,
  screeningQuestions: {
    orderBy: { orderIndex: "asc" },
  },
  _count: {
    select: {
      applications: true,
      bookmarks: true,
      views: true,
    },
  },
};

export const JobManagementService = {
  createJob: async (userId, data) => {
    if (!data.pageId) throw new ApiError(400, "Page ID is required");
    await validatePageJobPermission(data.pageId, userId);

    const baseSlug = generateSlug(data.title);
    const slug = await ensureUniqueSlug(baseSlug);

    if (data.deadline && new Date(data.deadline) <= new Date()) {
      throw new ApiError(400, "Deadline must be a future date");
    }

    if (data.salaryMin && data.salaryMax && data.salaryMin > data.salaryMax) {
      throw new ApiError(400, "Minimum salary cannot exceed maximum salary");
    }

    if (data.minimumExperience && data.maximumExperience && data.minimumExperience > data.maximumExperience) {
      throw new ApiError(400, "Minimum experience cannot exceed maximum experience");
    }

    const job = await db.$transaction(async (tx) => {
      const created = await tx.job.create({
        data: {
          title: data.title,
          slug,
          description: data.description,
          requirements: data.requirements,
          responsibilities: data.responsibilities,
          benefits: data.benefits,
          pageId: data.pageId,
          postedById: userId,
          jobType: data.jobType,
          workMode: data.workMode,
          experienceLevel: data.experienceLevel,
          location: data.location,
          salaryMin: data.salaryMin,
          salaryMax: data.salaryMax,
          currency: data.currency || "USD",
          salaryPeriod: data.salaryPeriod || "YEARLY",
          showSalary: data.showSalary ?? true,
          skills: data.skills || [],
          requiredSkills: data.requiredSkills || [],
          niceToHaveSkills: data.niceToHaveSkills || [],
          status: data.status || "DRAFT",
          applicationUrl: data.applicationUrl,
          applicationEmail: data.applicationEmail,
          deadline: data.deadline ? new Date(data.deadline) : null,
          isRemote: data.isRemote || false,
          isConfidential: data.isConfidential || false,
          department: data.department,
          industry: data.industry,
          categoryId: data.categoryId,
          urgency: data.urgency || "NORMAL",
          numberOfOpenings: data.numberOfOpenings || 1,
          applicationLimit: data.applicationLimit,
          minimumExperience: data.minimumExperience,
          maximumExperience: data.maximumExperience,
          educationLevel: data.educationLevel,
          hiringManagerId: data.hiringManagerId,
        },
        include: jobCardInclude,
      });

      if (created.status === "OPEN") {
        await recalculatePageJobCounters(tx, data.pageId);
      }

      return created;
    });

    
    if (job.status === "OPEN") {

      const orConditions = [
        {
          keywords: {
            hasSome: [
              job.title,
              ...(job.skills || []),
              ...(job.requiredSkills || []),
            ],
          },
        },
    
        {
          skills: {
            hasSome: [
              ...(job.skills || []),
              ...(job.requiredSkills || []),
            ],
          },
        },
      ];
    
      if (job.categoryId) {
        orConditions.push({
          categories: {
            has: job.categoryId,
          },
        });
      }
    
      const alerts = await db.jobAlert.findMany({
        where: {
          isActive: true,
          OR: orConditions,
        },
    
        select: {
          userId: true,
          frequency: true,
        },
      });
    
      console.log("JOB TITLE:", job.title);
      console.log("JOB SKILLS:", job.skills);
      console.log("MATCHED ALERTS:", alerts);
    
      const instantRecipients = [
        ...new Set(
          alerts
            .filter(
              (a) => a.frequency === "INSTANT"
            )
            .map((a) => a.userId)
        ),
      ];
    
      console.log(
        "INSTANT RECIPIENTS:",
        instantRecipients
      );
    
      if (instantRecipients.length > 0) {
    
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
    
        try {
          const result =
            await NotificationService.sendBulk({
              recipientIds:
                instantRecipients,
              type: "JOB_ALERT",
              category: "JOB",
              priority:
                job.urgency === "CRITICAL"
                  ? "HIGH"
                  : "MEDIUM",
              title:
                "New Job Matching Your Alert",
              message:
                `${job.title} matches your job preferences.`,
              entityType:
                "Job",
              entityId:
                job.id,
              actionUrl:
                `/manage`,
              actorId:
                actor?.id || null,
              actorName:
                `${actor?.firstName || ""} ${actor?.lastName || ""}`.trim() || null,
              actorAvatar:
                actor?.profilePhoto || null,
              data: {
                jobId:
                  job.id,
                title:
                  job.title,
                pageId:
                  job.pageId,
                categoryId:
                  job.categoryId,
                urgency:
                  job.urgency,
                workMode:
                  job.workMode,
              },
            });
          console.log(
            "NOTIFICATION RESULT:",
            result
          );
        } catch (err) {
          console.log(
            "JOB ALERT NOTIFICATION ERROR:"
          );
          console.log(err);
        }
      }
    }
    return job;
  },

  updateJob: async (userId, jobId, data) => {
    const job = await db.job.findUnique({ where: { id: jobId }, select: { id: true, pageId: true, status: true } });
    if (!job) throw new ApiError(404, "Job not found");
    if (!job.pageId) throw new ApiError(400, "Job is not associated with a page");
    await validatePageJobPermission(job.pageId, userId);

    if (data.deadline && new Date(data.deadline) <= new Date()) {
      throw new ApiError(400, "Deadline must be a future date");
    }

    const updateData = {};
    const fields = [
      "title", "description", "requirements", "responsibilities", "benefits",
      "jobType", "workMode", "experienceLevel", "location", "salaryMin", "salaryMax",
      "currency", "salaryPeriod", "showSalary", "skills", "applicationUrl",
      "applicationEmail", "isRemote", "isConfidential", "department", "industry",
      "categoryId", "urgency", "numberOfOpenings", "applicationLimit",
      "minimumExperience", "maximumExperience", "educationLevel", "hiringManagerId",
      "requiredSkills", "niceToHaveSkills", "isFeatured",
    ];

    for (const field of fields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    if (data.deadline !== undefined) {
      updateData.deadline = data.deadline ? new Date(data.deadline) : null;
    }

    if (data.title && data.title !== job.title) {
      const baseSlug = generateSlug(data.title);
      updateData.slug = await ensureUniqueSlug(baseSlug);
    }

    const updated = await db.job.update({
      where: { id: jobId },
      data: updateData,
      include: jobCardInclude,
    });

    return updated;
  },

  changeJobStatus: async (userId, jobId, newStatus) => {
    const job = await db.job.findUnique({ where: { id: jobId }, select: { id: true, pageId: true, status: true } });
    if (!job) throw new ApiError(404, "Job not found");
    if (!job.pageId) throw new ApiError(400, "Job is not associated with a page");
    await validatePageJobPermission(job.pageId, userId);

    const validTransitions = {
      DRAFT: ["OPEN"],
      OPEN: ["PAUSED", "CLOSED", "FILLED"],
      PAUSED: ["OPEN", "CLOSED"],
      CLOSED: [],
      FILLED: [],
    };

    if (!validTransitions[job.status]?.includes(newStatus)) {
      throw new ApiError(400, `Cannot transition from ${job.status} to ${newStatus}`);
    }

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.job.update({
        where: { id: jobId },
        data: { status: newStatus },
        include: jobCardInclude,
      });

      await recalculatePageJobCounters(tx, job.pageId);

      if (newStatus === "CLOSED" || newStatus === "FILLED") {
        const activeApps = await tx.jobApplication.findMany({
          where: { jobId, status: { in: ["APPLIED", "SCREENING"] } },
          select: { id: true, status: true },
        });

        for (const app of activeApps) {
          await tx.jobApplication.update({
            where: { id: app.id },
            data: { status: "WITHDRAWN" },
          });
          await tx.applicationTimeline.create({
            data: {
              applicationId: app.id,
              fromStatus: app.status,
              toStatus: "WITHDRAWN",
              changedById: userId,
              note: `Job ${newStatus.toLowerCase()} by employer`,
            },
          });
        }
      }

      return result;
    });

    return updated;
  },

  duplicateJob: async (userId, jobId) => {
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: { screeningQuestions: { orderBy: { orderIndex: "asc" } } },
    });
    if (!job) throw new ApiError(404, "Job not found");
    if (!job.pageId) throw new ApiError(400, "Job is not associated with a page");
    await validatePageJobPermission(job.pageId, userId);

    const baseSlug = generateSlug(job.title);
    const slug = await ensureUniqueSlug(baseSlug);

    const duplicated = await db.$transaction(async (tx) => {
      const newJob = await tx.job.create({
        data: {
          title: `${job.title} (Copy)`,
          slug,
          description: job.description,
          requirements: job.requirements,
          responsibilities: job.responsibilities,
          benefits: job.benefits,
          pageId: job.pageId,
          postedById: userId,
          jobType: job.jobType,
          workMode: job.workMode,
          experienceLevel: job.experienceLevel,
          location: job.location,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          currency: job.currency,
          salaryPeriod: job.salaryPeriod,
          showSalary: job.showSalary,
          skills: job.skills,
          requiredSkills: job.requiredSkills,
          niceToHaveSkills: job.niceToHaveSkills,
          status: "DRAFT",
          applicationUrl: job.applicationUrl,
          applicationEmail: job.applicationEmail,
          isRemote: job.isRemote,
          isConfidential: job.isConfidential,
          department: job.department,
          industry: job.industry,
          categoryId: job.categoryId,
          urgency: job.urgency,
          numberOfOpenings: job.numberOfOpenings,
          applicationLimit: job.applicationLimit,
          minimumExperience: job.minimumExperience,
          maximumExperience: job.maximumExperience,
          educationLevel: job.educationLevel,
          hiringManagerId: job.hiringManagerId,
        },
        include: jobCardInclude,
      });

      if (job.screeningQuestions.length > 0) {
        await tx.jobScreeningQuestion.createMany({
          data: job.screeningQuestions.map((q) => ({
            jobId: newJob.id,
            questionText: q.questionText,
            questionType: q.questionType,
            options: q.options,
            isRequired: q.isRequired,
            isEliminatory: q.isEliminatory,
            expectedAnswer: q.expectedAnswer,
            orderIndex: q.orderIndex,
          })),
        });
      }

      return newJob;
    });

    return duplicated;
  },

  deleteJob: async (userId, jobId) => {
    const job = await db.job.findUnique({ where: { id: jobId }, select: { id: true, pageId: true, status: true } });
    if (!job) throw new ApiError(404, "Job not found");
    if (!job.pageId) throw new ApiError(400, "Job is not associated with a page");
    await validatePageJobPermission(job.pageId, userId);

    await db.$transaction(async (tx) => {
      const activeApps = await tx.jobApplication.findMany({
        where: { jobId, status: { in: ["APPLIED", "SCREENING"] } },
        select: { id: true, status: true },
      });

      for (const app of activeApps) {
        await tx.jobApplication.update({ where: { id: app.id }, data: { status: "WITHDRAWN" } });
        await tx.applicationTimeline.create({
          data: {
            applicationId: app.id,
            fromStatus: app.status,
            toStatus: "WITHDRAWN",
            changedById: userId,
            note: "Job closed by employer",
          },
        });
      }

      await tx.job.update({ where: { id: jobId }, data: { status: "CLOSED" } });
      await recalculatePageJobCounters(tx, job.pageId);
    });

    return { message: "Job closed successfully" };
  },

  getPageJobs: async (userId, pageId, query) => {
    await validatePageJobPermission(pageId, userId, ["OWNER", "ADMIN", "EDITOR"]);

    const { skip, take, where, orderBy } = buildQueryOptions({
      page: query.page,
      limit: query.limit,
      search: query.search,
      defaultFields: ["title", "department"],
      sortBy: query.sortBy || "createdAt",
      order: query.order || "desc",
    });

    const filters = { ...where, pageId };
    if (query.status) filters.status = query.status;
    if (query.jobType) filters.jobType = query.jobType;
    if (query.workMode) filters.workMode = query.workMode;
    if (query.urgency) filters.urgency = query.urgency;

    const [jobs, total] = await Promise.all([
      db.job.findMany({ where: filters, skip, take, orderBy, include: jobCardInclude }),
      db.job.count({ where: filters }),
    ]);

    return { jobs, total, page: Number(query.page) || 1, limit: take };
  },

  getJobDetail: async (userId, jobId) => {
    const job = await db.job.findUnique({ where: { id: jobId }, include: jobDetailInclude });
    if (!job) throw new ApiError(404, "Job not found");
    if (!job.pageId) throw new ApiError(400, "Job is not associated with a page");
    await validatePageJobPermission(job.pageId, userId, ["OWNER", "ADMIN", "EDITOR"]);

    const statusBreakdown = await db.jobApplication.groupBy({
      by: ["status"],
      where: { jobId },
      _count: { status: true },
    });

    return { job, analytics: { statusBreakdown } };
  },

  getHiringDashboard: async (userId, pageId, query) => {
    await validatePageJobPermission(pageId, userId, ["OWNER", "ADMIN"]);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalOpen,
      totalJobs,
      appsThisWeek,
      appsThisMonth,
      appsTotal,
      statusBreakdown,
      urgentJobs,
      topJobs,
    ] = await Promise.all([
      db.job.count({ where: { pageId, status: "OPEN" } }),
      db.job.count({ where: { pageId } }),
      db.jobApplication.count({ where: { job: { pageId }, appliedAt: { gte: weekAgo } } }),
      db.jobApplication.count({ where: { job: { pageId }, appliedAt: { gte: monthAgo } } }),
      db.jobApplication.count({ where: { job: { pageId } } }),
      db.jobApplication.groupBy({
        by: ["status"],
        where: { job: { pageId } },
        _count: { status: true },
      }),
      db.job.findMany({
        where: { pageId, status: "OPEN", urgency: { in: ["URGENT", "CRITICAL"] } },
        include: jobCardInclude,
        orderBy: { createdAt: "desc" },
      }),
      db.job.findMany({
        where: { pageId, status: "OPEN" },
        orderBy: { applicationCount: "desc" },
        take: 5,
        include: jobCardInclude,
      }),
    ]);

    return {
      totalOpen,
      totalJobs,
      applications: { thisWeek: appsThisWeek, thisMonth: appsThisMonth, total: appsTotal },
      statusBreakdown,
      urgentJobs,
      topJobs,
    };
  },
};
