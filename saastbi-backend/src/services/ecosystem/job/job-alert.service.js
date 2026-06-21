import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import sendMail from "../../../config/sendMail.js";
import path from "path";

export const JobAlertService = {
  createAlert: async (userId, data) => {
    const hasCriteria =
      (data.keywords && data.keywords.length > 0) ||
      (data.jobTypes && data.jobTypes.length > 0) ||
      (data.workModes && data.workModes.length > 0) ||
      (data.experienceLevels && data.experienceLevels.length > 0) ||
      (data.locations && data.locations.length > 0) ||
      (data.skills && data.skills.length > 0) ||
      (data.industries && data.industries.length > 0) ||
      (data.categories && data.categories.length > 0) ||
      data.salaryMin ||
      data.salaryMax ||
      data.isRemoteOnly;

    if (!hasCriteria) {
      throw new ApiError(400, "At least one search criterion is required");
    }

    const alert = await db.jobAlert.create({
      data: {
        userId,
        name: data.name || "Job Alert",
        keywords: data.keywords || [],
        jobTypes: data.jobTypes || [],
        workModes: data.workModes || [],
        experienceLevels: data.experienceLevels || [],
        locations: data.locations || [],
        skills: data.skills || [],
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        industries: data.industries || [],
        categories: data.categories || [],
        isRemoteOnly: data.isRemoteOnly || false,
        frequency: data.frequency || "DAILY",
      },
    });

    return alert;
  },

  updateAlert: async (userId, alertId, data) => {
    const alert = await db.jobAlert.findUnique({ where: { id: alertId }, select: { id: true, userId: true } });
    if (!alert) throw new ApiError(404, "Alert not found");
    if (alert.userId !== userId) throw new ApiError(403, "You can only update your own alerts");

    const updateData = {};
    const fields = [
      "name", "keywords", "jobTypes", "workModes", "experienceLevels",
      "locations", "skills", "salaryMin", "salaryMax", "industries",
      "categories", "isRemoteOnly", "frequency",
    ];
    for (const field of fields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    const updated = await db.jobAlert.update({ where: { id: alertId }, data: updateData });
    return updated;
  },

  deleteAlert: async (userId, alertId) => {
    const alert = await db.jobAlert.findUnique({ where: { id: alertId }, select: { id: true, userId: true } });
    if (!alert) throw new ApiError(404, "Alert not found");
    if (alert.userId !== userId) throw new ApiError(403, "You can only delete your own alerts");

    await db.jobAlert.delete({ where: { id: alertId } });
    return { message: "Alert deleted successfully" };
  },

  getMyAlerts: async (userId) => {
    const alerts = await db.jobAlert.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return alerts;
  },

  toggleAlert: async (userId, alertId) => {
    const alert = await db.jobAlert.findUnique({ where: { id: alertId }, select: { id: true, userId: true, isActive: true } });
    if (!alert) throw new ApiError(404, "Alert not found");
    if (alert.userId !== userId) throw new ApiError(403, "You can only toggle your own alerts");

    const updated = await db.jobAlert.update({
      where: { id: alertId },
      data: { isActive: !alert.isActive },
    });
    return updated;
  },

  processAlerts: async (frequency) => {
    const alerts = await db.jobAlert.findMany({
      where: { isActive: true, frequency },
      include: { user: { select: { email: true, firstName: true } } },
    });

    let processed = 0;

    for (const alert of alerts) {
      try {
        const since = alert.lastTriggeredAt || new Date(Date.now() - 24 * 60 * 60 * 1000);
        const where = {
          AND: [
            { status: "OPEN" },
            { createdAt: { gt: since } },
            { OR: [{ deadline: null }, { deadline: { gt: new Date() } }] },
          ],
        };

        if (alert.keywords.length > 0) {
          where.AND.push({
            OR: alert.keywords.flatMap((kw) => [
              { title: { contains: kw, mode: "insensitive" } },
              { description: { contains: kw, mode: "insensitive" } },
            ]),
          });
        }
        if (alert.jobTypes.length > 0) where.AND.push({ jobType: { in: alert.jobTypes } });
        if (alert.workModes.length > 0) where.AND.push({ workMode: { in: alert.workModes } });
        if (alert.experienceLevels.length > 0) where.AND.push({ experienceLevel: { in: alert.experienceLevels } });
        if (alert.skills.length > 0) {
          where.AND.push({
            OR: [
              { skills: { hasSome: alert.skills } },
              { requiredSkills: { hasSome: alert.skills } },
            ],
          });
        }
        if (alert.locations.length > 0) {
          where.AND.push({
            OR: alert.locations.map((loc) => ({ location: { contains: loc, mode: "insensitive" } })),
          });
        }
        if (alert.industries.length > 0) {
          where.AND.push({
            OR: alert.industries.map((ind) => ({ industry: { contains: ind, mode: "insensitive" } })),
          });
        }
        if (alert.salaryMin) where.AND.push({ salaryMax: { gte: alert.salaryMin } });
        if (alert.salaryMax) where.AND.push({ salaryMin: { lte: alert.salaryMax } });
        if (alert.isRemoteOnly) where.AND.push({ OR: [{ isRemote: true }, { workMode: "REMOTE" }] });

        const matchingJobs = await db.job.findMany({
          where,
          take: 10,
          orderBy: { createdAt: "desc" },
          include: {
            page: { select: { name: true, logo: true } },
          },
        });

        if (matchingJobs.length > 0) {
          try {
            await sendMail(
              alert.user.email,
              `${matchingJobs.length} new job${matchingJobs.length > 1 ? "s" : ""} matching "${alert.name}"`,
              path.resolve("src/mails/job-alert-digest.ejs"),
              {
                userName: alert.user.firstName,
                alertName: alert.name,
                jobs: matchingJobs.map((j) => ({
                  title: j.title,
                  company: j.page?.name || "Company",
                  location: j.location || "Remote",
                  salaryRange: j.showSalary && j.salaryMin
                    ? `${j.currency} ${j.salaryMin}${j.salaryMax ? ` - ${j.salaryMax}` : ""}/${j.salaryPeriod.toLowerCase()}`
                    : null,
                  slug: j.slug,
                })),
              }
            );
          } catch (_) {}
        }

        await db.jobAlert.update({
          where: { id: alert.id },
          data: { lastTriggeredAt: new Date() },
        });

        processed++;
      } catch (err) {
        console.error(`Job alert processing error for alert ${alert.id}:`, err.message);
      }
    }

    return { processed, total: alerts.length };
  },
};
