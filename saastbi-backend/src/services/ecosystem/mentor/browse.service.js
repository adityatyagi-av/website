import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { generateAvailableSlots } from "../../../utils/mentor/availability.js";
import {
  USER_BRIEF_SELECT,
  USER_SELECT,
  verifyStartupAccess,
  buildPagination,
} from "./helpers.js";

export const BrowseService = {
  discoverMentors: async (userId, query) => {
    const {
      search,
      expertise,
      industries,
      languages,
      minPrice,
      maxPrice,
      minRating,
      availability,
      sortBy = "rating",
      page = 1,
      limit = 12,
    } = query;

    const where = {
      isAccepting: true,
      verificationStatus: "VERIFIED",
      profileVisibility: "PUBLIC",
    };

    if (search) {
      where.OR = [
        { user: { firstName: { contains: search, mode: "insensitive" } } },
        { user: { lastName: { contains: search, mode: "insensitive" } } },
        { headline: { contains: search, mode: "insensitive" } },
        { bio: { contains: search, mode: "insensitive" } },
        { user: { username: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (expertise) {
      const list = Array.isArray(expertise) ? expertise : [expertise];
      where.expertise = { hasSome: list };
    }

    if (industries) {
      const list = Array.isArray(industries) ? industries : [industries];
      where.industries = { hasSome: list };
    }

    if (languages) {
      const list = Array.isArray(languages) ? languages : [languages];
      where.languages = { hasSome: list };
    }

    if (minPrice || maxPrice) {
      where.sessionTypes = {
        some: {
          isActive: true,
          ...(minPrice && { price: { gte: parseFloat(minPrice) } }),
          ...(maxPrice && { price: { lte: parseFloat(maxPrice) } }),
        },
      };
    }

    if (minRating) {
      where.rating = { gte: parseFloat(minRating) };
    }

    const orderBy = {};
    switch (sortBy) {
      case "rating":
        orderBy.rating = "desc";
        break;
      case "sessions":
        orderBy.totalSessions = "desc";
        break;
      case "newest":
        orderBy.createdAt = "desc";
        break;
      default:
        orderBy.rating = "desc";
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [mentors, total] = await Promise.all([
      db.mentorProfile.findMany({
        where,
        include: {
          user: { select: USER_BRIEF_SELECT },
          sessionTypes: {
            where: { isActive: true },
            select: { id: true, name: true, duration: true, price: true },
            take: 3,
          },
        },
        orderBy,
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

  getMentorProfile: async (mentorId, userId) => {
    const mentor = await db.mentorProfile.findFirst({
      where: { id: mentorId, profileVisibility: "PUBLIC" },
      include: {
        user: { select: USER_SELECT },
        sessionTypes: {
          where: { isActive: true },
          orderBy: { price: "asc" },
        },
        packages: {
          where: { isActive: true },
          orderBy: { price: "asc" },
        },
        reviews: {
          where: { isPublic: true },
          take: 5,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!mentor) {
      throw new ApiError(404, "Mentor not found");
    }

    return mentor;
  },

  getMentorSessionTypes: async (mentorId) => {
    return db.sessionType.findMany({
      where: { mentorId, isActive: true },
      orderBy: { price: "asc" },
    });
  },

  getMentorPackages: async (mentorId) => {
    return db.mentorPackage.findMany({
      where: { mentorProfileId: mentorId, isActive: true },
      orderBy: { price: "asc" },
    });
  },

  getMentorAvailability: async (mentorId, date, sessionTypeId) => {
    const mentor = await db.mentorProfile.findUnique({
      where: { id: mentorId },
      include: { availability: true },
    });

    if (!mentor) {
      throw new ApiError(404, "Mentor not found");
    }

    let sessionDuration = 60;
    if (sessionTypeId) {
      const sessionType = await db.sessionType.findUnique({
        where: { id: sessionTypeId },
      });
      if (sessionType) {
        sessionDuration = sessionType.duration;
      }
    }

    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const existingSessions = await db.mentorSession.findMany({
      where: {
        mentorId,
        startTime: { gte: startDate, lt: endDate },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      select: { startTime: true, duration: true },
    });

    const slots = generateAvailableSlots({
      availabilitySlots: mentor.availability,
      startDate,
      endDate,
      sessionDuration,
      existingSessions,
      bufferMinutes: mentor.bufferBetweenSessions || 15,
      minBookingNoticeHours: mentor.minBookingNotice || 24,
    });

    return slots;
  },

  getMentorReviews: async (mentorId, query) => {
    const { page = 1, limit = 10 } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reviews, total] = await Promise.all([
      db.mentorReview.findMany({
        where: { mentorId, isPublic: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      db.mentorReview.count({ where: { mentorId, isPublic: true } }),
    ]);

    const reviewerIds = [...new Set(reviews.map((r) => r.reviewerId))];
    const reviewers = reviewerIds.length
      ? await db.user.findMany({
          where: { id: { in: reviewerIds } },
          select: USER_BRIEF_SELECT,
        })
      : [];
    const reviewerMap = Object.fromEntries(reviewers.map((u) => [u.id, u]));

    const reviewsWithReviewer = reviews.map((r) => ({
      ...r,
      reviewer: reviewerMap[r.reviewerId] || null,
    }));

    return {
      reviews: reviewsWithReviewer,
      pagination: buildPagination(page, limit, total),
    };
  },

  getFeaturedMentors: async (query) => {
    const { limit = 6 } = query;

    return db.mentorProfile.findMany({
      where: {
        isAccepting: true,
        verificationStatus: "VERIFIED",
        profileVisibility: "PUBLIC",
        isFeatured: true,
      },
      include: {
        user: { select: USER_BRIEF_SELECT },
        sessionTypes: {
          where: { isActive: true },
          select: { price: true },
          take: 1,
          orderBy: { price: "asc" },
        },
      },
      orderBy: { rating: "desc" },
      take: parseInt(limit),
    });
  },

  getRecommendedMentors: async (userId, query) => {
    const { limit = 6 } = query;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    const where = {
      isAccepting: true,
      verificationStatus: "VERIFIED",
      profileVisibility: "PUBLIC",
    };

    return db.mentorProfile.findMany({
      where,
      include: {
        user: { select: USER_BRIEF_SELECT },
        sessionTypes: {
          where: { isActive: true },
          select: { price: true },
          take: 1,
          orderBy: { price: "asc" },
        },
      },
      orderBy: { rating: "desc" },
      take: parseInt(limit),
    });
  },

  getIncubatorMentors: async (userId, startupId, query) => {
    const startup = await verifyStartupAccess(userId, startupId);
    const tenantAssoc = startup.tenantAssociations?.[0];

    if (!tenantAssoc) {
      return { mentors: [], message: "Startup is not part of any incubator" };
    }

    const tenantId = tenantAssoc.tenantId;
    const { page = 1, limit = 12 } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [associations, total] = await Promise.all([
      db.incubatorMentorAssociation.findMany({
        where: {
          tenantId,
          status: "ACTIVE",
        },
        include: {
          mentor: {
            include: {
              user: { select: USER_BRIEF_SELECT },
              sessionTypes: {
                where: { isActive: true },
                select: { id: true, name: true, duration: true, price: true },
                take: 3,
              },
            },
          },
        },
        skip,
        take: parseInt(limit),
      }),
      db.incubatorMentorAssociation.count({
        where: { tenantId, status: "ACTIVE" },
      }),
    ]);

    const mentors = associations.map((a) => ({
      ...a.mentor,
      incubatorSharePercent: a.incubatorSharePercent,
      paymentModel: a.paymentModel,
    }));

    return {
      mentors,
      incubator: tenantAssoc.tenant,
      pagination: buildPagination(page, limit, total),
    };
  },

  saveMentor: async (userId, mentorId) => {
    const mentor = await db.mentorProfile.findUnique({
      where: { id: mentorId },
    });
    if (!mentor) throw new ApiError(404, "Mentor not found");
    return;
  },

  unsaveMentor: async (userId, mentorId) => {
    return;
  },

  getSavedMentors: async (userId, query) => {
    return {
      mentors: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    };
  },
};
