import db from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";
import { buildQueryOptions } from "../../utils/queryHelper.js";

export const MentorProfileService = {
  createProfile: async ({ userId, data }) => {
    const existingProfile = await db.mentorProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      throw new ApiError(409, "Mentor profile already exists");
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new ApiError(404, "User not found or inactive");
    }


    // Use transaction to ensure both profile and role are created
    const profile = await db.$transaction(async (tx) => {
      // 1. Assign MENTOR role if not exists
      const existingRole = await tx.userRole.findUnique({
        where: {
          userId_roleType: {
            userId,
            roleType: "MENTOR",
          },
        },
      });

      if (!existingRole) {
        await tx.userRole.create({
          data: {
            userId,
            roleType: "MENTOR",
            isPrimary: false,
            isPublic: true,
            isVerified: false, 
          },
        });
      }

      // 2. Create Mentor Profile
      return await tx.mentorProfile.create({
        data: {
          userId,
          ...data,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
              headline: true,
            },
          },
        },
      });
    });


    return profile;
  },

  getOwnProfile: async ({ userId }) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePhoto: true,
            headline: true,
            bio: true,
          },
        },
        sessionTypes: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
        },
        availability: {
          where: { isActive: true },
          orderBy: { dayOfWeek: "asc" },
        },
        packages: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
        },
        _count: {
          select: {
            reviews: true,
            sessions: true,
            mentorships: true,
          },
        },
      },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    return profile;
  },

  updateProfile: async ({ userId, data }) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const updated = await db.mentorProfile.update({
      where: { userId },
      data,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            headline: true,
          },
        },
      },
    });

    return updated;
  },

  updateVisibility: async ({ userId, visibility }) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const updated = await db.mentorProfile.update({
      where: { userId },
      data: { profileVisibility: visibility },
    });

    return updated;
  },

  getPublicProfile: async ({ mentorId, viewerId = null, startupId = null }) => {
    const profile = await db.mentorProfile.findUnique({
      where: { id: mentorId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            headline: true,
            bio: true,
            location: {
              select: { city: true, country: true },
            },
            socialLinks: {
              select: { linkedin: true, twitter: true, website: true },
            },
          },
        },
        sessionTypes: {
          where: { isActive: true },
          orderBy: { price: "asc" },
          select: {
            id: true,
            name: true,
            description: true,
            duration: true,
            price: true,
            currency: true,
          },
        },
        packages: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
          select: {
            id: true,
            name: true,
            description: true,
            packageType: true,
            sessionsIncluded: true,
            validityDays: true,
            price: true,
            originalPrice: true,
            currency: true,
            discountPercent: true,
            features: true,
          },
        },
        reviews: {
          where: { isPublic: true },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            rating: true,
            review: true,
            createdAt: true,
          },
        },
        contentItems: {
          where: { isPublic: true },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            url: true,
            thumbnail: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            sessions: { where: { status: "COMPLETED" } },
          },
        },
      },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor not found");
    }

    if (profile.profileVisibility === "PRIVATE") {
      throw new ApiError(403, "This profile is private");
    }

    if (profile.profileVisibility === "INCUBATOR_ONLY" && viewerId) {
      const hasIncubatorAccess = await checkIncubatorAccess(mentorId, viewerId, startupId);
      if (!hasIncubatorAccess) {
        throw new ApiError(403, "This profile is only visible to incubator members");
      }
    }

    return {
      ...profile,
      totalCompletedSessions: profile._count.sessions,
      totalReviews: profile._count.reviews,
    };
  },

  discoverMentors: async ({ query, viewerId = null }) => {
    const { skip, take, orderBy } = buildQueryOptions({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy || "rating",
      order: query.order || "desc",
    });

    const where = {
      profileVisibility: "PUBLIC",
      verificationStatus: "VERIFIED",
      isAccepting: true,
      user: { isActive: true },
    };

    if (query.search) {
      where.OR = [
        { headline: { contains: query.search, mode: "insensitive" } },
        { bio: { contains: query.search, mode: "insensitive" } },
        { user: { firstName: { contains: query.search, mode: "insensitive" } } },
        { user: { lastName: { contains: query.search, mode: "insensitive" } } },
      ];
    }

    if (query.expertise) {
      const expertiseArray = Array.isArray(query.expertise)
        ? query.expertise
        : query.expertise.split(",");
      where.expertise = { hasSome: expertiseArray };
    }

    if (query.industries) {
      const industriesArray = Array.isArray(query.industries)
        ? query.industries
        : query.industries.split(",");
      where.industries = { hasSome: industriesArray };
    }

    if (query.startupStages) {
      const stagesArray = Array.isArray(query.startupStages)
        ? query.startupStages
        : query.startupStages.split(",");
      where.startupStages = { hasSome: stagesArray };
    }

    if (query.languages) {
      const languagesArray = Array.isArray(query.languages)
        ? query.languages
        : query.languages.split(",");
      where.languages = { hasSome: languagesArray };
    }

    if (query.minRating) {
      where.rating = { gte: parseFloat(query.minRating) };
    }

    if (query.isProBonoAvailable !== undefined) {
      where.isProBonoAvailable = query.isProBonoAvailable;
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.sessionTypes = {
        some: {
          isActive: true,
          ...(query.minPrice !== undefined && { price: { gte: parseFloat(query.minPrice) } }),
          ...(query.maxPrice !== undefined && { price: { lte: parseFloat(query.maxPrice) } }),
        },
      };
    }

    const [mentors, total] = await Promise.all([
      db.mentorProfile.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
              headline: true,
            },
          },
          sessionTypes: {
            where: { isActive: true },
            orderBy: { price: "asc" },
            take: 1,
            select: {
              price: true,
              currency: true,
              duration: true,
            },
          },
          _count: {
            select: {
              reviews: true,
              sessions: { where: { status: "COMPLETED" } },
            },
          },
        },
      }),
      db.mentorProfile.count({ where }),
    ]);

    const enrichedMentors = mentors.map((mentor) => ({
      id: mentor.id,
      user: mentor.user,
      headline: mentor.headline,
      expertise: mentor.expertise,
      industries: mentor.industries,
      startupStages: mentor.startupStages,
      rating: mentor.rating,
      reviewCount: mentor.reviewCount,
      totalSessions: mentor._count.sessions,
      isProBonoAvailable: mentor.isProBonoAvailable,
      startingPrice: mentor.sessionTypes[0]?.price || null,
      currency: mentor.sessionTypes[0]?.currency || "INR",
      isFeatured: mentor.isFeatured,
    }));

    return {
      data: enrichedMentors,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  },

  getFeaturedMentors: async ({ limit = 10 }) => {
    const mentors = await db.mentorProfile.findMany({
      where: {
        isFeatured: true,
        profileVisibility: "PUBLIC",
        verificationStatus: "VERIFIED",
        isAccepting: true,
        OR: [
          { featuredUntil: null },
          { featuredUntil: { gte: new Date() } },
        ],
      },
      take: limit,
      orderBy: { rating: "desc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            headline: true,
          },
        },
        sessionTypes: {
          where: { isActive: true },
          orderBy: { price: "asc" },
          take: 1,
          select: { price: true, currency: true },
        },
      },
    });

    return mentors.map((mentor) => ({
      id: mentor.id,
      user: mentor.user,
      headline: mentor.headline,
      expertise: mentor.expertise.slice(0, 3),
      rating: mentor.rating,
      reviewCount: mentor.reviewCount,
      startingPrice: mentor.sessionTypes[0]?.price || null,
      currency: mentor.sessionTypes[0]?.currency || "INR",
    }));
  },

  getProfileStats: async ({ userId }) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const [
      totalSessions,
      completedSessions,
      pendingSessions,
      activeMentorships,
      totalEarnings,
      averageRating,
    ] = await Promise.all([
      db.mentorSession.count({ where: { mentorId: profile.id } }),
      db.mentorSession.count({ where: { mentorId: profile.id, status: "COMPLETED" } }),
      db.mentorSession.count({ where: { mentorId: profile.id, status: "PENDING" } }),
      db.mentorship.count({ where: { mentorProfileId: profile.id, status: "ACTIVE" } }),
      db.mentorEarning.aggregate({
        where: { mentorId: profile.id, status: "COMPLETED" },
        _sum: { netAmount: true },
      }),
      db.mentorReview.aggregate({
        where: { mentorId: profile.id },
        _avg: { rating: true },
      }),
    ]);

    return {
      totalSessions,
      completedSessions,
      pendingSessions,
      completionRate: totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0,
      activeMentorships,
      totalEarnings: totalEarnings._sum.netAmount || 0,
      averageRating: averageRating._avg.rating || 0,
    };
  },

  getMentorReviews: async ({ mentorId, query }) => {
    const { skip, take } = buildQueryOptions({
      page: query.page,
      limit: query.limit,
    });

    const [reviews, total] = await Promise.all([
      db.mentorReview.findMany({
        where: { mentorId, isPublic: true },
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          rating: true,
          review: true,
          createdAt: true,
        },
      }),
      db.mentorReview.count({ where: { mentorId, isPublic: true } }),
    ]);

    return {
      data: reviews,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  },
};

async function checkIncubatorAccess(mentorId, viewerId, startupId = null) {
  let userStartupIds = [];

  if (startupId) {
    userStartupIds = [startupId];
  } else {
    // Fallback: fetch startups for user
    const viewerStartups = await db.startupMember.findMany({
      where: { userId: viewerId, isActive: true },
      select: { startupId: true },
    });
    if (viewerStartups.length === 0) return false;
    userStartupIds = viewerStartups.map((s) => s.startupId);
  }

  const incubatorAssociations = await db.tenantStartupAssociation.findMany({
    where: { startupId: { in: userStartupIds }, isActive: true },
    select: { tenantId: true },
  });

  const tenantIds = incubatorAssociations.map((a) => a.tenantId);

  const mentorIncubatorAssociation = await db.incubatorMentorAssociation.findFirst({
    where: {
      mentorProfileId: mentorId,
      tenantId: { in: tenantIds },
      status: "ACTIVE",
    },
  });

  return !!mentorIncubatorAssociation;
}
