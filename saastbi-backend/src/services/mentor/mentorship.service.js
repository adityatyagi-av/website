import db from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";
import { buildQueryOptions } from "../../utils/queryHelper.js";
import { NotificationService } from "../common/notification.service.js";

export const MentorshipService = {
  create: async (userId, data) => {
    const mentor = await db.mentorProfile.findUnique({
      where: { id: data.mentorProfileId },
      select: { id: true, userId: true, isAccepting: true },
    });

    if (!mentor) {
      throw new ApiError(404, "Mentor not found");
    }

    if (!mentor.isAccepting) {
      throw new ApiError(400, "Mentor is not accepting mentorships");
    }

    let menteeUserId = userId;
    let startupId = null;

    if (data.menteeType === "STARTUP") {
      if (!data.startupId) {
        throw new ApiError(400, "Startup ID required");
      }

      const membership = await db.startupMember.findFirst({
        where: { startupId: data.startupId, userId, isActive: true },
      });

      if (!membership) {
        throw new ApiError(403, "You are not a member of this startup");
      }

      startupId = data.startupId;
      menteeUserId = null;
    }

    const existingMentorship = await db.mentorship.findFirst({
      where: {
        mentorProfileId: data.mentorProfileId,
        ...(data.menteeType === "STARTUP"
          ? { startupId }
          : { userId: menteeUserId }),
        status: { in: ["PENDING", "ACTIVE"] },
      },
    });

    if (existingMentorship) {
      throw new ApiError(409, "You already have an active or pending mentorship with this mentor");
    }

    const mentorship = await db.mentorship.create({
      data: {
        mentorProfileId: data.mentorProfileId,
        menteeType: data.menteeType,
        userId: menteeUserId,
        startupId,
        engagementType: data.engagementType,
        programId: data.programId,
        frequency: data.frequency,
        objectives: data.objectives,
        goals: data.goals,
        isEquityBased: data.isEquityBased || false,
        equityPercent: data.equityPercent,
        equityNotes: data.equityNotes,
        status: "PENDING",
      },
      include: {
        mentor: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                profilePhoto: true,
              },
            },
          },
        },
      },
    });

    NotificationService.send({
      recipientId: mentor.userId,
      type: "MENTORSHIP_REQUEST",
      category: "MENTORSHIP",
      priority: "HIGH",
      title: "New Mentorship Request",
      message: "You have received a new mentorship request",
      actionUrl: `/mentor/mentorships/${mentorship.id}`,
      entityType: "Mentorship",
      entityId: mentorship.id,
    }).catch(() => {});

    return mentorship;
  },

  accept: async (userId, mentorshipId, data) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const mentorship = await db.mentorship.findUnique({
      where: { id: mentorshipId },
    });

    if (!mentorship || mentorship.mentorProfileId !== profile.id) {
      throw new ApiError(404, "Mentorship not found");
    }

    if (mentorship.status !== "PENDING") {
      throw new ApiError(400, `Mentorship is ${mentorship.status}, cannot accept`);
    }

    const updated = await db.$transaction(async (tx) => {
      const accepted = await tx.mentorship.update({
        where: { id: mentorshipId },
        data: {
          status: "ACTIVE",
          startDate: new Date(),
          frequency: data.suggestedFrequency || mentorship.frequency,
          mentorNotes: data.mentorNotes,
        },
        include: {
          mentor: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      await tx.mentorProfile.update({
        where: { id: profile.id },
        data: { activeMentees: { increment: 1 } },
      });

      return accepted;
    });

    const menteeUserId = mentorship.userId || await getStartupAdminUserId(mentorship.startupId);
    if (menteeUserId) {
      NotificationService.send({
        recipientId: menteeUserId,
        type: "MENTORSHIP_ACCEPTED",
        category: "MENTORSHIP",
        title: "Mentorship Request Accepted",
        message: "Your mentorship request has been accepted",
        actionUrl: `/mentorships/${mentorshipId}`,
        actorId: userId,
        entityType: "Mentorship",
        entityId: mentorshipId,
      }).catch(() => {});
    }

    return updated;
  },

  updateStatus: async (userId, mentorshipId, status, reason) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    const mentorship = await db.mentorship.findUnique({
      where: { id: mentorshipId },
    });

    if (!mentorship) {
      throw new ApiError(404, "Mentorship not found");
    }

    const isMentor = profile && mentorship.mentorProfileId === profile.id;
    const isMentee =
      mentorship.userId === userId ||
      (mentorship.startupId &&
        (await db.startupMember.findFirst({
          where: { startupId: mentorship.startupId, userId, isActive: true },
        })));

    if (!isMentor && !isMentee) {
      throw new ApiError(403, "Not authorized");
    }

    const validTransitions = {
      PENDING: ["ACTIVE", "ENDED"],
      ACTIVE: ["PAUSED", "COMPLETED", "ENDED"],
      PAUSED: ["ACTIVE", "ENDED"],
    };

    if (!validTransitions[mentorship.status]?.includes(status)) {
      throw new ApiError(400, `Cannot transition from ${mentorship.status} to ${status}`);
    }

    const updateData = { status };

    if (status === "ENDED" || status === "COMPLETED") {
      updateData.endDate = new Date();
      updateData.endedAt = new Date();
      updateData.endedBy = userId;
      updateData.endReason = reason;
    }

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.mentorship.update({
        where: { id: mentorshipId },
        data: updateData,
      });

      if ((status === "ENDED" || status === "COMPLETED") && mentorship.status === "ACTIVE") {
        await tx.mentorProfile.update({
          where: { id: mentorship.mentorProfileId },
          data: { activeMentees: { decrement: 1 } },
        });
      }

      return result;
    });

    return updated;
  },

  end: async (userId, mentorshipId, reason) => {
    return MentorshipService.updateStatus(userId, mentorshipId, "ENDED", reason);
  },

  getById: async (userId, mentorshipId) => {
    const mentorship = await db.mentorship.findUnique({
      where: { id: mentorshipId },
      include: {
        mentor: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePhoto: true,
                headline: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            headline: true,
          },
        },
        startup: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            industry: true,
            stage: true,
          },
        },
        milestones: {
          orderBy: { displayOrder: "asc" },
        },
        sessions: {
          orderBy: { startTime: "desc" },
          take: 5,
          select: {
            id: true,
            title: true,
            startTime: true,
            status: true,
          },
        },
      },
    });

    if (!mentorship) {
      throw new ApiError(404, "Mentorship not found");
    }

    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    const isMentor = profile && mentorship.mentorProfileId === profile.id;
    const isMentee =
      mentorship.userId === userId ||
      (mentorship.startupId &&
        (await db.startupMember.findFirst({
          where: { startupId: mentorship.startupId, userId, isActive: true },
        })));

    if (!isMentor && !isMentee) {
      throw new ApiError(403, "Not authorized");
    }

    return {
      ...mentorship,
      viewerRole: isMentor ? "MENTOR" : "MENTEE",
    };
  },

  getMentorMentorships: async (userId, query) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const { skip, take } = buildQueryOptions({
      page: query.page,
      limit: query.limit,
    });

    const where = { mentorProfileId: profile.id };

    if (query.status) {
      where.status = query.status;
    }

    if (query.engagementType) {
      where.engagementType = query.engagementType;
    }

    const [mentorships, total] = await Promise.all([
      db.mentorship.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
            },
          },
          startup: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
          _count: {
            select: { sessions: true, milestones: true },
          },
        },
      }),
      db.mentorship.count({ where }),
    ]);

    return {
      data: mentorships,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  },

  getMenteeMentorships: async (userId, query, startupId = null) => {
    const { skip, take } = buildQueryOptions({
      page: query.page,
      limit: query.limit,
    });

    const where = startupId ? { startupId } : { userId };

    if (query.status) {
      where.status = query.status;
    }

    const [mentorships, total] = await Promise.all([
      db.mentorship.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          mentor: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profilePhoto: true,
                  headline: true,
                },
              },
            },
          },
          _count: {
            select: { sessions: true, milestones: true },
          },
        },
      }),
      db.mentorship.count({ where }),
    ]);

    return {
      data: mentorships,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  },

  addMilestone: async (userId, mentorshipId, data) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const mentorship = await db.mentorship.findUnique({
      where: { id: mentorshipId },
    });

    if (!mentorship || mentorship.mentorProfileId !== profile.id) {
      throw new ApiError(404, "Mentorship not found");
    }

    const milestone = await db.mentorshipMilestone.create({
      data: {
        mentorshipId,
        title: data.title,
        description: data.description,
        targetDate: data.targetDate,
        displayOrder: data.displayOrder || 0,
        status: "PENDING",
      },
    });

    return milestone;
  },

  updateMilestone: async (userId, milestoneId, data) => {
    const milestone = await db.mentorshipMilestone.findUnique({
      where: { id: milestoneId },
      include: { mentorship: true },
    });

    if (!milestone) {
      throw new ApiError(404, "Milestone not found");
    }

    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    const isMentor = profile && milestone.mentorship.mentorProfileId === profile.id;
    const isMentee =
      milestone.mentorship.userId === userId ||
      (milestone.mentorship.startupId &&
        (await db.startupMember.findFirst({
          where: { startupId: milestone.mentorship.startupId, userId, isActive: true },
        })));

    if (!isMentor && !isMentee) {
      throw new ApiError(403, "Not authorized");
    }

    const updateData = { ...data };

    if (data.status === "COMPLETED" && milestone.status !== "COMPLETED") {
      updateData.completedAt = new Date();
      updateData.progress = 100;
    }

    const updated = await db.mentorshipMilestone.update({
      where: { id: milestoneId },
      data: updateData,
    });

    return updated;
  },

  deleteMilestone: async (userId, milestoneId) => {
    const milestone = await db.mentorshipMilestone.findUnique({
      where: { id: milestoneId },
      include: { mentorship: true },
    });

    if (!milestone) {
      throw new ApiError(404, "Milestone not found");
    }

    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile || milestone.mentorship.mentorProfileId !== profile.id) {
      throw new ApiError(403, "Only mentor can delete milestones");
    }

    await db.mentorshipMilestone.delete({
      where: { id: milestoneId },
    });

    return { success: true };
  },

  getMilestones: async (userId, mentorshipId) => {
    const mentorship = await db.mentorship.findUnique({
      where: { id: mentorshipId },
    });

    if (!mentorship) {
      throw new ApiError(404, "Mentorship not found");
    }

    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    const isMentor = profile && mentorship.mentorProfileId === profile.id;
    const isMentee =
      mentorship.userId === userId ||
      (mentorship.startupId &&
        (await db.startupMember.findFirst({
          where: { startupId: mentorship.startupId, userId, isActive: true },
        })));

    if (!isMentor && !isMentee) {
      throw new ApiError(403, "Not authorized");
    }

    const milestones = await db.mentorshipMilestone.findMany({
      where: { mentorshipId },
      orderBy: { displayOrder: "asc" },
    });

    return milestones;
  },
};

async function getStartupAdminUserId(startupId) {
  if (!startupId) return null;
  const admin = await db.startupMember.findFirst({
    where: { startupId, isAdmin: true, isActive: true },
    select: { userId: true },
  });
  return admin?.userId;
}
