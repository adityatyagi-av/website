import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  profilePhoto: true,
};

const USER_BRIEF_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  profilePhoto: true,
};

const USER_NAME_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
};

const tenantStartupFilter = (tenantId) => ({
  tenantAssociations: { some: { tenantId } },
});

const buildPagination = (page, limit, total) => ({
  page: parseInt(page),
  limit: parseInt(limit),
  total,
  totalPages: Math.ceil(total / parseInt(limit)),
});

export const IncubationMentorService = {
  discoverMentors: async (tenantId, query) => {
    const {
      search,
      expertise,
      industries,
      minRating,
      excludeAssociated = "true",
      page = 1,
      limit = 12,
    } = query;

    const where = {
      isAccepting: true,
      verificationStatus: "VERIFIED",
    };

    if (excludeAssociated === "true") {
      where.incubatorAssociations = {
        none: {
          tenantId,
          status: { in: ["ACTIVE", "PENDING"] },
        },
      };
    }

    if (search) {
      where.OR = [
        { user: { firstName: { contains: search, mode: "insensitive" } } },
        { user: { lastName: { contains: search, mode: "insensitive" } } },
        { headline: { contains: search, mode: "insensitive" } },
      ];
    }

    if (expertise) {
      const expertiseList = Array.isArray(expertise) ? expertise : [expertise];
      where.expertise = { hasSome: expertiseList };
    }

    if (industries) {
      const industryList = Array.isArray(industries)
        ? industries
        : [industries];
      where.industries = { hasSome: industryList };
    }

    if (minRating) {
      where.rating = { gte: parseFloat(minRating) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [mentors, total] = await Promise.all([
      db.mentorProfile.findMany({
        where,
        include: {
          user: { select: USER_SELECT },
          sessionTypes: {
            where: { isActive: true },
            select: { id: true, name: true, duration: true, price: true },
            take: 3,
          },
        },
        orderBy: { rating: "desc" },
        skip,
        take: parseInt(limit),
      }),
      db.mentorProfile.count({ where }),
    ]);

    return {
      mentors,
      pagination: buildPagination(page, limit, total),
    };
  },

  getAssociatedMentors: async (tenantId, query) => {
    const { status = "ACTIVE", page = 1, limit = 12 } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { tenantId };
    if (status) {
      where.status = status;
    }

    const [associations, total] = await Promise.all([
      db.incubatorMentorAssociation.findMany({
        where,
        include: {
          mentor: {
            include: { user: { select: USER_SELECT } },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      db.incubatorMentorAssociation.count({ where }),
    ]);

    return {
      associations,
      pagination: buildPagination(page, limit, total),
    };
  },

  getMentorProfile: async (tenantId, mentorId) => {
    const mentor = await db.mentorProfile.findUnique({
      where: { id: mentorId },
      include: {
        user: { select: USER_SELECT },
        sessionTypes: { where: { isActive: true } },
        packages: { where: { isActive: true } },
        incubatorAssociations: { where: { tenantId } },
      },
    });

    if (!mentor) {
      throw new ApiError(404, "Mentor not found");
    }

    return mentor;
  },

  inviteMentor: async (userId, tenantId, mentorId, data) => {
    const {
      paymentModel,
      incubatorSharePercent,
      agreedRate,
      retainerAmount,
      notes,
    } = data;

    const mentor = await db.mentorProfile.findUnique({
      where: { id: mentorId, isAccepting: true },
    });

    if (!mentor) {
      throw new ApiError(404, "Mentor not found");
    }

    const existingAssociation =
      await db.incubatorMentorAssociation.findFirst({
        where: {
          mentorProfileId: mentorId,
          tenantId,
          status: { in: ["ACTIVE", "PENDING"] },
        },
      });

    if (existingAssociation) {
      throw new ApiError(
        409,
        "An association already exists with this mentor"
      );
    }

    const association = await db.incubatorMentorAssociation.create({
      data: {
        mentorProfileId: mentorId,
        tenantId,
        initiatedBy: "INCUBATOR",
        paymentModel: paymentModel || "STARTUP_PAYS",
        incubatorSharePercent: incubatorSharePercent || 0,
        agreedRate,
        retainerAmount,
        notes,
        status: "PENDING",
      },
      include: {
        mentor: {
          include: {
            user: {
              select: { ...USER_NAME_SELECT, email: true },
            },
          },
        },
      },
    });

    return association;
  },

  approveApplication: async (userId, tenantId, associationId, data) => {
    const {
      paymentModel,
      incubatorSharePercent,
      agreedRate,
      retainerAmount,
      notes,
    } = data;

    const association = await db.incubatorMentorAssociation.findFirst({
      where: {
        id: associationId,
        tenantId,
        status: "PENDING",
        initiatedBy: "MENTOR",
      },
    });

    if (!association) {
      throw new ApiError(404, "Application not found");
    }

    const updatedAssociation = await db.incubatorMentorAssociation.update({
      where: { id: associationId },
      data: {
        status: "ACTIVE",
        approvedBy: userId,
        approvedAt: new Date(),
        paymentModel: paymentModel || association.paymentModel,
        incubatorSharePercent:
          incubatorSharePercent ?? association.incubatorSharePercent ?? 0,
        agreedRate: agreedRate ?? association.agreedRate,
        retainerAmount: retainerAmount ?? association.retainerAmount,
        notes: notes || association.notes,
      },
      include: {
        mentor: {
          include: {
            user: {
              select: { ...USER_NAME_SELECT, email: true },
            },
          },
        },
      },
    });

    return updatedAssociation;
  },

  rejectApplication: async (userId, tenantId, associationId, reason) => {
    const association = await db.incubatorMentorAssociation.findFirst({
      where: {
        id: associationId,
        tenantId,
        status: "PENDING",
      },
    });

    if (!association) {
      throw new ApiError(404, "Application not found");
    }

    const updatedAssociation = await db.incubatorMentorAssociation.update({
      where: { id: associationId },
      data: {
        status: "REJECTED",
        endedBy: userId,
        endedAt: new Date(),
        endReason: reason,
      },
    });

    return updatedAssociation;
  },

  updateAssociation: async (userId, tenantId, associationId, data) => {
    const association = await db.incubatorMentorAssociation.findFirst({
      where: {
        id: associationId,
        tenantId,
        status: "ACTIVE",
      },
    });

    if (!association) {
      throw new ApiError(404, "Association not found");
    }

    const updatedAssociation = await db.incubatorMentorAssociation.update({
      where: { id: associationId },
      data: {
        paymentModel: data.paymentModel ?? association.paymentModel,
        incubatorSharePercent:
          data.incubatorSharePercent ?? association.incubatorSharePercent,
        agreedRate: data.agreedRate ?? association.agreedRate,
        retainerAmount: data.retainerAmount ?? association.retainerAmount,
        notes: data.notes ?? association.notes,
      },
      include: {
        mentor: {
          include: {
            user: {
              select: { ...USER_NAME_SELECT, email: true },
            },
          },
        },
      },
    });

    return updatedAssociation;
  },

  endAssociation: async (userId, tenantId, associationId, reason) => {
    const association = await db.incubatorMentorAssociation.findFirst({
      where: {
        id: associationId,
        tenantId,
        status: "ACTIVE",
      },
    });

    if (!association) {
      throw new ApiError(404, "Association not found");
    }

    const updatedAssociation = await db.incubatorMentorAssociation.update({
      where: { id: associationId },
      data: {
        status: "ENDED",
        endedAt: new Date(),
        endedBy: userId,
        endReason: reason,
      },
    });

    return updatedAssociation;
  },

  getAssociationDetails: async (tenantId, associationId) => {
    const association = await db.incubatorMentorAssociation.findFirst({
      where: {
        id: associationId,
        tenantId,
      },
      include: {
        mentor: {
          include: {
            user: { select: USER_SELECT },
            sessionTypes: { where: { isActive: true } },
          },
        },
        sessions: {
          take: 10,
          orderBy: { startTime: "desc" },
          include: {
            menteeUser: { select: USER_NAME_SELECT },
            menteeStartup: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!association) {
      throw new ApiError(404, "Association not found");
    }

    return association;
  },

  getMentorUsage: async (tenantId, associationId, month, year) => {
    const association = await db.incubatorMentorAssociation.findFirst({
      where: { id: associationId, tenantId },
    });

    if (!association) {
      throw new ApiError(404, "Association not found");
    }

    const currentDate = new Date();
    const targetMonth = month ? parseInt(month) - 1 : currentDate.getMonth();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    const sessions = await db.mentorSession.findMany({
      where: {
        mentorId: association.mentorProfileId,
        menteeStartup: tenantStartupFilter(tenantId),
        startTime: {
          gte: startDate,
          lte: endDate,
        },
        status: { in: ["COMPLETED", "CONFIRMED", "PENDING"] },
      },
      include: {
        menteeStartup: { select: { id: true, name: true } },
        menteeUser: { select: USER_NAME_SELECT },
        sessionType: true,
      },
    });

    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(
      (s) => s.status === "COMPLETED"
    ).length;
    const totalHours = sessions.reduce((acc, s) => acc + s.duration / 60, 0);
    const totalSpending = sessions.reduce(
      (acc, s) => acc + (s.incubatorShare || 0),
      0
    );

    const byStartup = {};
    sessions.forEach((session) => {
      const sid = session.startupId;
      if (!sid) return;
      if (!byStartup[sid]) {
        byStartup[sid] = {
          startup: session.menteeStartup,
          sessions: 0,
          hours: 0,
          spending: 0,
        };
      }
      byStartup[sid].sessions++;
      byStartup[sid].hours += session.duration / 60;
      byStartup[sid].spending += session.incubatorShare || 0;
    });

    return {
      month: targetMonth + 1,
      year: targetYear,
      totalSessions,
      completedSessions,
      totalHours,
      totalSpending,
      byStartup: Object.values(byStartup),
      sessions,
    };
  },

  getPendingApplications: async (tenantId, query) => {
    const { page = 1, limit = 10 } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [applications, total] = await Promise.all([
      db.incubatorMentorAssociation.findMany({
        where: {
          tenantId,
          status: "PENDING",
          initiatedBy: "MENTOR",
        },
        include: {
          mentor: {
            include: { user: { select: USER_SELECT } },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      db.incubatorMentorAssociation.count({
        where: { tenantId, status: "PENDING", initiatedBy: "MENTOR" },
      }),
    ]);

    return {
      applications,
      pagination: buildPagination(page, limit, total),
    };
  },

  getAllSessions: async (tenantId, query) => {
    const {
      status,
      mentorId,
      startupId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      menteeStartup: tenantStartupFilter(tenantId),
    };

    if (status) where.status = status;
    if (mentorId) where.mentorId = mentorId;
    if (startupId) where.startupId = startupId;

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }

    const [sessions, total] = await Promise.all([
      db.mentorSession.findMany({
        where,
        include: {
          mentor: {
            include: { user: { select: USER_BRIEF_SELECT } },
          },
          menteeUser: { select: USER_BRIEF_SELECT },
          menteeStartup: { select: { id: true, name: true } },
          sessionType: true,
        },
        orderBy: { startTime: "desc" },
        skip,
        take: parseInt(limit),
      }),
      db.mentorSession.count({ where }),
    ]);

    return {
      sessions,
      pagination: buildPagination(page, limit, total),
    };
  },

  getSessionDetails: async (tenantId, sessionId) => {
    const session = await db.mentorSession.findFirst({
      where: {
        id: sessionId,
        menteeStartup: tenantStartupFilter(tenantId),
      },
      include: {
        mentor: {
          include: { user: { select: USER_SELECT } },
        },
        menteeUser: { select: USER_SELECT },
        menteeStartup: { select: { id: true, name: true } },
        sessionType: true,
      },
    });

    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    return session;
  },

  getMentorAnalytics: async (tenantId, query) => {
    const { startDate, endDate } = query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.startTime = {};
      if (startDate) dateFilter.startTime.gte = new Date(startDate);
      if (endDate) dateFilter.startTime.lte = new Date(endDate);
    }

    const tenantFilter = {
      menteeStartup: tenantStartupFilter(tenantId),
    };

    const [
      totalMentors,
      activeMentors,
      totalSessions,
      completedSessions,
      totalSpending,
    ] = await Promise.all([
      db.incubatorMentorAssociation.count({
        where: { tenantId, status: { in: ["ACTIVE", "ENDED"] } },
      }),
      db.incubatorMentorAssociation.count({
        where: { tenantId, status: "ACTIVE" },
      }),
      db.mentorSession.count({
        where: { ...tenantFilter, ...dateFilter },
      }),
      db.mentorSession.count({
        where: {
          ...tenantFilter,
          status: "COMPLETED",
          ...dateFilter,
        },
      }),
      db.mentorSession.aggregate({
        where: {
          ...tenantFilter,
          status: { in: ["COMPLETED", "CONFIRMED"] },
          ...dateFilter,
        },
        _sum: { incubatorShare: true },
      }),
    ]);

    const topMentors = await db.mentorSession.groupBy({
      by: ["mentorId"],
      where: {
        ...tenantFilter,
        status: "COMPLETED",
        ...dateFilter,
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    });

    const topMentorsWithDetails = await Promise.all(
      topMentors.map(async (m) => {
        const mentor = await db.mentorProfile.findUnique({
          where: { id: m.mentorId },
          include: { user: { select: USER_BRIEF_SELECT } },
        });
        return {
          mentor,
          sessionsCount: m._count.id,
        };
      })
    );

    return {
      totalMentors,
      activeMentors,
      totalSessions,
      completedSessions,
      totalSpending: totalSpending._sum.incubatorShare || 0,
      topMentors: topMentorsWithDetails,
    };
  },

  getMentorSpending: async (tenantId, query) => {
    const { startDate, endDate } = query;

    const where = {
      menteeStartup: tenantStartupFilter(tenantId),
      status: { in: ["COMPLETED", "CONFIRMED"] },
      paymentStatus: "PAID",
    };

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }

    const sessions = await db.mentorSession.findMany({
      where,
      select: {
        incubatorShare: true,
        price: true,
        startTime: true,
        mentorId: true,
      },
    });

    const totalSubsidy = sessions.reduce(
      (acc, s) => acc + (s.incubatorShare || 0),
      0
    );
    const totalValue = sessions.reduce((acc, s) => acc + s.price, 0);

    const byMentor = {};
    sessions.forEach((s) => {
      if (!byMentor[s.mentorId]) {
        byMentor[s.mentorId] = { subsidy: 0, sessions: 0 };
      }
      byMentor[s.mentorId].subsidy += s.incubatorShare || 0;
      byMentor[s.mentorId].sessions++;
    });

    return {
      totalSubsidy,
      totalValue,
      sessionsCount: sessions.length,
      byMentor: Object.entries(byMentor).map(([mentorId, data]) => ({
        mentorId,
        ...data,
      })),
    };
  },

  getStartupMentorUsage: async (tenantId, startupId, query) => {
    const startup = await db.startup.findFirst({
      where: {
        id: startupId,
        tenantAssociations: { some: { tenantId } },
      },
    });

    if (!startup) {
      throw new ApiError(404, "Startup not found");
    }

    const { startDate, endDate } = query;

    const where = { startupId };
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }

    const sessions = await db.mentorSession.findMany({
      where,
      include: {
        mentor: {
          include: { user: { select: USER_BRIEF_SELECT } },
        },
        sessionType: true,
      },
      orderBy: { startTime: "desc" },
    });

    const byMentor = {};
    sessions.forEach((session) => {
      const mid = session.mentorId;
      if (!byMentor[mid]) {
        byMentor[mid] = {
          mentor: session.mentor,
          sessions: [],
          totalSessions: 0,
          totalHours: 0,
          totalSpending: 0,
          incubatorShare: 0,
        };
      }
      byMentor[mid].sessions.push(session);
      byMentor[mid].totalSessions++;
      byMentor[mid].totalHours += session.duration / 60;
      byMentor[mid].totalSpending +=
        session.startupShare || session.price || 0;
      byMentor[mid].incubatorShare += session.incubatorShare || 0;
    });

    return {
      startup,
      totalSessions: sessions.length,
      totalSpending: sessions.reduce(
        (acc, s) => acc + (s.startupShare || s.price || 0),
        0
      ),
      totalIncubatorSubsidy: sessions.reduce(
        (acc, s) => acc + (s.incubatorShare || 0),
        0
      ),
      byMentor: Object.values(byMentor),
    };
  },
};
