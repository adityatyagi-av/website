import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import sendMail from "../../../config/sendMail.js";
import path from "path";
import { NotificationService } from "../../common/notification.service.js";

async function validatePageMembership(pageId, userId) {
  const member = await db.pageMember.findFirst({
    where: { pageId, userId },
    select: { role: true },
  });
  if (!member) {
    throw new ApiError(403, "Only page members can refer candidates");
  }
  return member;
}

export const JobReferralService = {
  referCandidate: async (userId, jobId, data) => {
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: { page: { select: { id: true, name: true } } },
    });
    if (!job) throw new ApiError(404, "Job not found");
    if (job.status !== "OPEN") throw new ApiError(400, "This job is no longer accepting applications");
    if (!job.pageId) throw new ApiError(400, "Job is not associated with a page");

    await validatePageMembership(job.pageId, userId);

    const referrer = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true,username: true },
    });

    if (referrer.email === data.referredEmail) {
      throw new ApiError(400, "You cannot refer yourself");
    }

    const existing = await db.jobReferral.findUnique({
      where: { jobId_referredEmail: { jobId, referredEmail: data.referredEmail } },
      select: { id: true },
    });
    if (existing) throw new ApiError(409, "A referral already exists for this email and job");

    const referredUser = await db.user.findUnique({
      where: { email: data.referredEmail },
      select: { id: true },
    });

    const referral = await db.jobReferral.create({
      data: {
        referralId: referral.id,
        jobId,
        referrerId: userId,
        referredEmail: data.referredEmail,
        referredUserId: referredUser?.id || null,
        note: data.note,
        status: "PENDING",
        actorSlug: referral.referrer.username,
      },
      include: {
        referrer: { select: { firstName: true, lastName: true,profilePhoto: true } },
        job: { select: { title: true, slug: true } },
      },
    });

    try {
      await sendMail(
        data.referredEmail,
        `${referrer.firstName} ${referrer.lastName} referred you for a job at ${job.page.name}`,
        path.resolve("src/mails/job-referral-invite.ejs"),
        {
          referrerName: `${referrer.firstName} ${referrer.lastName}`,
          companyName: job.page.name,
          jobTitle: job.title,
          jobDescription: job.description?.substring(0, 200) || "",
          referralNote: data.note || null,
          jobSlug: job.slug,
        }
      );
    } catch (_) {}

    if (referredUser?.id) {
      await NotificationService.send({
        recipientId:
          referredUser.id,
        type:
          "JOB_REFERRAL_RECEIVED",
        category:
          "JOB",
        priority:
          "MEDIUM",
        title:
          "You Received a Job Referral",
        message:
          `${referrer.firstName} ${referrer.lastName} referred you for ${job.title}.`,
        actionUrl:
          `/job/${job.slug}`,
        actorId:
          userId,
        actorName:
          `${referrer.firstName} ${referrer.lastName}`,
        actorAvatar: referral.referrer.profilePhoto || null,
        entityType:
          "JobReferral",
        entityId:
          referral.id,
        data: {
          referralId:
            referral.id,
          jobId:
            job.id,
          pageId:
            job.pageId,
          referredEmail:
            data.referredEmail,
          status:
            "PENDING",
          actorSlug: referral.referrer.username,
        },
      }).catch(() => {});
    }

    return referral;
  },

  getMyReferrals: async (userId, query) => {
    const page = Number(query?.page) || 1;
    const limit = Math.min(Number(query?.limit) || 12, 50);
    const skip = (page - 1) * limit;

    const [referrals, total] = await Promise.all([
      db.jobReferral.findMany({
        where: { referrerId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
              page: { select: { name: true, logo: true } },
            },
          },
          referredUser: { select: { firstName: true, lastName: true, profilePhoto: true } },
        },
      }),
      db.jobReferral.count({ where: { referrerId: userId } }),
    ]);

    return { referrals, total, page, limit };
  },

  getReferralsForJob: async (userId, jobId) => {
    const job = await db.job.findUnique({ where: { id: jobId }, select: { id: true, pageId: true } });
    if (!job) throw new ApiError(404, "Job not found");
    if (!job.pageId) throw new ApiError(400, "Job is not associated with a page");

    const member = await db.pageMember.findFirst({
      where: { pageId: job.pageId, userId },
      select: { role: true },
    });
    if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
      throw new ApiError(403, "You don't have permission to view referrals");
    }

    const referrals = await db.jobReferral.findMany({
      where: { jobId },
      orderBy: { createdAt: "desc" },
      include: {
        referrer: { select: { firstName: true, lastName: true, profilePhoto: true, headline: true } },
        referredUser: { select: { firstName: true, lastName: true, profilePhoto: true, headline: true } },
        applications: {
          select: { id: true, status: true, matchScore: true },
        },
      },
    });

    return referrals;
  },
};
