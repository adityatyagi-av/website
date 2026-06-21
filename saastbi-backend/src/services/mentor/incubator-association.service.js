import db from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";
import { buildQueryOptions } from "../../utils/queryHelper.js";
import { NotificationService } from "../common/notification.service.js";

export const IncubatorAssociationService = {
  apply: async (userId, tenantId, data) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true, verificationStatus: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    if (profile.verificationStatus !== "VERIFIED") {
      throw new ApiError(400, "Only verified mentors can apply to incubators");
    }

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, organizationName: true, status: true },
    });

    if (!tenant || tenant.status !== "ACTIVE") {
      throw new ApiError(404, "Incubator not found or inactive");
    }

    const existingAssociation = await db.incubatorMentorAssociation.findUnique({
      where: {
        mentorProfileId_tenantId: {
          mentorProfileId: profile.id,
          tenantId,
        },
      },
    });

    if (existingAssociation) {
      if (existingAssociation.status === "ACTIVE") {
        throw new ApiError(409, "Already associated with this incubator");
      }
      if (existingAssociation.status === "PENDING") {
        throw new ApiError(409, "Application already pending");
      }
    }

    const association = await db.incubatorMentorAssociation.create({
      data: {
        mentorProfileId: profile.id,
        tenantId,
        status: "PENDING",
        initiatedBy: "MENTOR",
        paymentModel: "STARTUP_PAYS",
        agreedRate: data.proposedRate,
        notes: data.notes,
      },
      include: {
        tenant: {
          select: {
            id: true,
            organizationName: true,
          },
        },
      },
    });

    return association;
  },

  respondToInvitation: async (userId, associationId, action, notes) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const association = await db.incubatorMentorAssociation.findUnique({
      where: { id: associationId },
    });

    if (!association || association.mentorProfileId !== profile.id) {
      throw new ApiError(404, "Association not found");
    }

    if (association.status !== "PENDING") {
      throw new ApiError(400, `Association is ${association.status}`);
    }

    if (association.initiatedBy !== "INCUBATOR") {
      throw new ApiError(400, "This is not an invitation");
    }

    const updateData =
      action === "ACCEPT"
        ? {
            status: "ACTIVE",
            approvedAt: new Date(),
            startDate: new Date(),
            notes,
          }
        : {
            status: "REJECTED",
            endedAt: new Date(),
            endReason: notes,
          };

    const updated = await db.incubatorMentorAssociation.update({
      where: { id: associationId },
      data: updateData,
      include: {
        tenant: {
          select: { id: true, organizationName: true },
        },
      },
    });

    return updated;
  },

  invite: async (incubationUserId, tenantId, mentorId, data) => {
    const membership = await db.incubationUserTenant.findUnique({
      where: {
        incubationUserId_tenantId: { incubationUserId, tenantId },
      },
    });

    if (!membership || !membership.isActive) {
      throw new ApiError(403, "Not authorized");
    }

    const mentor = await db.mentorProfile.findUnique({
      where: { id: mentorId },
      select: { id: true, userId: true, verificationStatus: true },
    });

    if (!mentor) {
      throw new ApiError(404, "Mentor not found");
    }

    const existingAssociation = await db.incubatorMentorAssociation.findUnique({
      where: {
        mentorProfileId_tenantId: {
          mentorProfileId: mentorId,
          tenantId,
        },
      },
    });

    if (existingAssociation) {
      if (existingAssociation.status === "ACTIVE") {
        throw new ApiError(409, "Mentor already associated");
      }
      if (existingAssociation.status === "PENDING") {
        throw new ApiError(409, "Invitation already pending");
      }
    }

    const association = await db.incubatorMentorAssociation.create({
      data: {
        mentorProfileId: mentorId,
        tenantId,
        status: "PENDING",
        initiatedBy: "INCUBATOR",
        paymentModel: data.paymentModel,
        agreedRate: data.agreedRate,
        retainerAmount: data.retainerAmount,
        retainerHours: data.retainerHours,
        incubatorSharePercent: data.incubatorSharePercent,
        startDate: data.startDate,
        endDate: data.endDate,
        isExclusive: data.isExclusive || false,
        autoApproveBookings: data.autoApproveBookings || false,
        notes: data.notes,
      },
      include: {
        mentor: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    NotificationService.send({
      recipientId: mentor.userId,
      type: "INCUBATOR_INVITATION",
      category: "INCUBATION",
      priority: "HIGH",
      title: "Incubator Partnership Invitation",
      message: "You have received an invitation from an incubator",
      actionUrl: `/mentor/incubators/${association.id}`,
      entityType: "IncubatorMentorAssociation",
      entityId: association.id,
    }).catch(() => {});

    return association;
  },

  approve: async (incubationUserId, tenantId, associationId, data) => {
    const membership = await db.incubationUserTenant.findUnique({
      where: {
        incubationUserId_tenantId: { incubationUserId, tenantId },
      },
    });

    if (!membership || !membership.isActive) {
      throw new ApiError(403, "Not authorized");
    }

    const association = await db.incubatorMentorAssociation.findUnique({
      where: { id: associationId },
      include: { mentor: true },
    });

    if (!association || association.tenantId !== tenantId) {
      throw new ApiError(404, "Association not found");
    }

    if (association.status !== "PENDING") {
      throw new ApiError(400, `Association is ${association.status}`);
    }

    const updated = await db.incubatorMentorAssociation.update({
      where: { id: associationId },
      data: {
        status: "ACTIVE",
        approvedAt: new Date(),
        approvedBy: incubationUserId,
        startDate: new Date(),
        paymentModel: data.paymentModel || association.paymentModel,
        agreedRate: data.agreedRate ?? association.agreedRate,
        retainerAmount: data.retainerAmount ?? association.retainerAmount,
        retainerHours: data.retainerHours ?? association.retainerHours,
        incubatorSharePercent: data.incubatorSharePercent ?? association.incubatorSharePercent,
        notes: data.notes,
      },
      include: {
        mentor: {
          include: {
            user: {
              select: { firstName: true, lastName: true, profilePhoto: true },
            },
          },
        },
      },
    });

    NotificationService.send({
      recipientId: association.mentor.userId,
      type: "INCUBATOR_APPLICATION_APPROVED",
      category: "INCUBATION",
      priority: "HIGH",
      title: "Application Approved",
      message: "Your application to the incubator has been approved",
      actionUrl: `/mentor/incubators`,
      entityType: "IncubatorMentorAssociation",
      entityId: associationId,
    }).catch(() => {});

    return updated;
  },

  reject: async (incubationUserId, tenantId, associationId, reason) => {
    const membership = await db.incubationUserTenant.findUnique({
      where: {
        incubationUserId_tenantId: { incubationUserId, tenantId },
      },
    });

    if (!membership || !membership.isActive) {
      throw new ApiError(403, "Not authorized");
    }

    const association = await db.incubatorMentorAssociation.findUnique({
      where: { id: associationId },
      include: { mentor: true },
    });

    if (!association || association.tenantId !== tenantId) {
      throw new ApiError(404, "Association not found");
    }

    const updated = await db.incubatorMentorAssociation.update({
      where: { id: associationId },
      data: {
        status: "REJECTED",
        endedAt: new Date(),
        endedBy: incubationUserId,
        endReason: reason,
      },
    });

    NotificationService.send({
      recipientId: association.mentor.userId,
      type: "INCUBATOR_APPLICATION_REJECTED",
      category: "INCUBATION",
      priority: "MEDIUM",
      title: "Application Rejected",
      message: `Your application was rejected: ${reason}`,
      actionUrl: `/mentor/incubators`,
      entityType: "IncubatorMentorAssociation",
      entityId: associationId,
    }).catch(() => {});

    return updated;
  },

  update: async (incubationUserId, tenantId, associationId, data) => {
    const membership = await db.incubationUserTenant.findUnique({
      where: {
        incubationUserId_tenantId: { incubationUserId, tenantId },
      },
    });

    if (!membership || !membership.isActive) {
      throw new ApiError(403, "Not authorized");
    }

    const association = await db.incubatorMentorAssociation.findUnique({
      where: { id: associationId },
    });

    if (!association || association.tenantId !== tenantId) {
      throw new ApiError(404, "Association not found");
    }

    if (association.status !== "ACTIVE") {
      throw new ApiError(400, "Can only update active associations");
    }

    const updated = await db.incubatorMentorAssociation.update({
      where: { id: associationId },
      data,
    });

    return updated;
  },

  end: async (userId, associationId, reason, isMentor = true) => {
    let association;

    if (isMentor) {
      const profile = await db.mentorProfile.findUnique({
        where: { userId },
        select: { id: true },
      });

      association = await db.incubatorMentorAssociation.findUnique({
        where: { id: associationId },
      });

      if (!association || association.mentorProfileId !== profile?.id) {
        throw new ApiError(404, "Association not found");
      }
    } else {
      association = await db.incubatorMentorAssociation.findUnique({
        where: { id: associationId },
      });
    }

    if (!association) {
      throw new ApiError(404, "Association not found");
    }

    if (association.status !== "ACTIVE") {
      throw new ApiError(400, "Association is not active");
    }

    const updated = await db.incubatorMentorAssociation.update({
      where: { id: associationId },
      data: {
        status: "ENDED",
        endedAt: new Date(),
        endedBy: userId,
        endReason: reason,
        endDate: new Date(),
      },
    });

    return updated;
  },

  getMentorAssociations: async (userId, query) => {
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

    const [associations, total] = await Promise.all([
      db.incubatorMentorAssociation.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          tenant: {
            select: {
              id: true,
              organizationName: true,
              tenantLogo: true,
            },
          },
        },
      }),
      db.incubatorMentorAssociation.count({ where }),
    ]);

    return {
      data: associations,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  },

  getIncubatorMentors: async (tenantId, query) => {
    const { skip, take } = buildQueryOptions({
      page: query.page,
      limit: query.limit,
    });

    const where = { tenantId };

    if (query.status) {
      where.status = query.status;
    }

    const [associations, total] = await Promise.all([
      db.incubatorMentorAssociation.findMany({
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
        },
      }),
      db.incubatorMentorAssociation.count({ where }),
    ]);

    return {
      data: associations,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  },

  getUsage: async (associationId, month, year) => {
    const association = await db.incubatorMentorAssociation.findUnique({
      where: { id: associationId },
    });

    if (!association) {
      throw new ApiError(404, "Association not found");
    }

    const currentDate = new Date();
    const targetMonth = month || currentDate.getMonth() + 1;
    const targetYear = year || currentDate.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const sessions = await db.mentorSession.findMany({
      where: {
        incubatorAssociationId: associationId,
        status: "COMPLETED",
        startTime: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        duration: true,
        actualDuration: true,
        price: true,
        menteeStartup: {
          select: { id: true, name: true },
        },
        menteeUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    const totalMinutes = sessions.reduce(
      (sum, s) => sum + (s.actualDuration || s.duration),
      0
    );

    return {
      month: targetMonth,
      year: targetYear,
      hoursUsed: Math.round((totalMinutes / 60) * 100) / 100,
      sessionsCount: sessions.length,
      retainerHours: association.retainerHours,
      hoursRemaining:
        association.paymentModel === "RETAINER"
          ? Math.max(0, (association.retainerHours || 0) - totalMinutes / 60)
          : null,
      sessions,
    };
  },

  getAvailableIncubators: async (userId) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const existingAssociations = await db.incubatorMentorAssociation.findMany({
      where: { mentorProfileId: profile.id },
      select: { tenantId: true },
    });

    const excludedTenantIds = existingAssociations.map((a) => a.tenantId);

    const incubators = await db.tenant.findMany({
      where: {
        status: "ACTIVE",
        id: { notIn: excludedTenantIds },
      },
      select: {
        id: true,
        organizationName: true,
        tenantLogo: true,
        _count: {
          select: {
            incubatorMentorAssociations: { where: { status: "ACTIVE" } },
            startupAssociations: { where: { isActive: true } },
          },
        },
      },
      take: 20,
    });

    return incubators.map((inc) => ({
      id: inc.id,
      name: inc.organizationName,
      logo: inc.tenantLogo,
      activeMentors: inc._count.incubatorMentorAssociations,
      activeStartups: inc._count.startupAssociations,
    }));
  },
};
