import db from "../../../db/db.js";
import { getRedis, setRedis } from "../../../config/redisClient.js";
import {
  USER_NETWORKING_SELECT,
  buildPagination,
  getBlockedUserIds,
  getExcludedConnectionUserIds,
  addViewerContext,
  getMutualConnectionCount,
} from "./helpers.js";
import { ScoringService } from "./scoring.service.js";

const CACHE_TTL = 5 * 60;

const buildUserInclude = () => ({
  location: { select: { city: true, state: true, country: true } },
  roles: { select: { roleType: true, isPrimary: true, isVerified: true, isPublic: true } },
  skills: {
    select: { skill: { select: { id: true, name: true, category: true } }, proficiency: true },
    take: 10,
  },
  mentorProfile: {
    select: {
      id: true, rating: true, reviewCount: true, expertise: true,
      industries: true, isAccepting: true, verificationStatus: true,
      totalMentees: true, totalSessions: true, headline: true,
    },
  },
  freelancerProfile: {
    select: {
      id: true, title: true, hourlyRate: true, currency: true,
      isAvailable: true, rating: true, categories: true, isVerified: true,
    },
  },
  investorProfile: {
    select: {
      id: true, investorType: true, firmName: true, sectors: true,
      investmentStages: true, checkSizeMin: true, checkSizeMax: true,
      isVerified: true, totalInvestments: true,
    },
  },
  professionalProfile: {
    select: {
      id: true, openToOpportunities: true, lookingFor: true,
      preferredRoles: true, isVerified: true,
    },
  },
  studentProfile: {
    select: {
      id: true, isLookingForIntern: true, internshipInterests: true,
      careerGoals: true, isVerified: true,
    },
  },
  _count: { select: { followers: true, following: true, posts: true } },
});

export const PeopleService = {
  discoverPeople: async (userId, query) => {
    const {
      search,
      roleType,
      sector,
      location,
      verifiedOnly,
      availableNow,
      sortBy = "relevance",
      page = 1,
      limit = 12,
    } = query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { isActive: true };
    const excludeIds = [userId];

    if (userId) {
      const [blockedIds, connectionExcludeIds] = await Promise.all([
        getBlockedUserIds(userId),
        getExcludedConnectionUserIds(userId),
      ]);
      excludeIds.push(...blockedIds, ...connectionExcludeIds);
    }

    where.id = { notIn: excludeIds };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { headline: { contains: search, mode: "insensitive" } },
      ];
    }

    if (roleType) {
      const roles = Array.isArray(roleType) ? roleType : [roleType];
      where.roles = { some: { roleType: { in: roles }, isPublic: true } };
    }

    if (location) {
      where.location = {
        OR: [
          { city: { contains: location, mode: "insensitive" } },
          { state: { contains: location, mode: "insensitive" } },
          { country: { contains: location, mode: "insensitive" } },
        ],
      };
    }

    if (verifiedOnly === "true") {
      where.roles = {
        ...where.roles,
        some: { ...(where.roles?.some || {}), isVerified: true },
      };
    }

    if (availableNow === "true") {
      where.OR = [
        ...(where.OR || []),
        { mentorProfile: { isAccepting: true, verificationStatus: "VERIFIED" } },
        { freelancerProfile: { isAvailable: true } },
        { professionalProfile: { openToOpportunities: true } },
        { studentProfile: { isLookingForIntern: true } },
      ];
    }

    if (sector) {
      where.OR = [
        ...(where.OR || []),
        { mentorProfile: { industries: { has: sector } } },
        { mentorProfile: { expertise: { has: sector } } },
        { investorProfile: { sectors: { has: sector } } },
        { freelancerProfile: { categories: { has: sector } } },
        { skills: { some: { skill: { category: { contains: sector, mode: "insensitive" } } } } },
      ];
    }

    let orderBy = { createdAt: "desc" };
    if (sortBy === "popular") {
      orderBy = { followers: { _count: "desc" } };
    } else if (sortBy === "recent") {
      orderBy = { lastActive: "desc" };
    }

    const fetchLimit = userId && sortBy === "relevance" ? take * 4 : take;

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: { ...USER_NETWORKING_SELECT, ...buildUserInclude() },
        orderBy,
        skip: sortBy === "relevance" ? 0 : skip,
        take: sortBy === "relevance" ? fetchLimit : take,
      }),
      db.user.count({ where }),
    ]);

    let results = users;

    if (userId && sortBy === "relevance") {
      const viewer = await db.user.findUnique({
        where: { id: userId },
        select: {
          ...USER_NETWORKING_SELECT,
          ...buildUserInclude(),
          cofounderPreference: true,
        },
      });

      const scored = await Promise.all(
        users.map(async (candidate) => {
          const mutualCount = await getMutualConnectionCount(userId, candidate.id);
          candidate._mutualCount = mutualCount;
          const { score, reasons } = ScoringService.computePeopleMatchScore(viewer, candidate);
          return { ...candidate, _matchScore: score, _matchReasons: reasons, _mutualCount: mutualCount };
        })
      );

      scored.sort((a, b) => b._matchScore - a._matchScore);
      results = scored.slice(skip, skip + take);
    }

    const enriched = await Promise.all(
      results.map(async (user) => {
        const viewerCtx = userId ? await addViewerContext(userId, user.id) : null;
        const mutualCount = user._mutualCount ?? (userId ? await getMutualConnectionCount(userId, user.id) : 0);

        const tags = [];
        if (user.mentorProfile?.isAccepting) tags.push("Open to Mentor");
        if (user.freelancerProfile?.isAvailable) tags.push("Available for Work");
        if (user.professionalProfile?.openToOpportunities) tags.push("Open to Opportunities");
        if (user.studentProfile?.isLookingForIntern) tags.push("Looking for Internship");
        if (user.roles?.some((r) => r.isVerified)) tags.push("Verified");

        return {
          ...user,
          mutualConnections: mutualCount,
          matchScore: user._matchScore || null,
          matchReasons: user._matchReasons || [],
          tags,
          viewerContext: viewerCtx,
        };
      })
    );

    return {
      data: enriched,
      pagination: buildPagination(page, limit, total),
    };
  },

  getPersonNetworkingProfile: async (userId, targetUserId) => {
    const user = await db.user.findUnique({
      where: { id: targetUserId, isActive: true },
      select: {
        ...USER_NETWORKING_SELECT,
        ...buildUserInclude(),
        experiences: {
          select: {
            id: true, title: true, companyName: true, startDate: true,
            endDate: true, isCurrent: true,
            page: { select: { id: true, name: true, logo: true, slug: true } },
          },
          orderBy: { startDate: "desc" },
          take: 5,
        },
        educations: {
          select: {
            id: true, degree: true, fieldOfStudy: true, institution: true,
            startDate: true, endDate: true,
            page: { select: { id: true, name: true, logo: true, slug: true } },
          },
          orderBy: { startDate: "desc" },
          take: 3,
        },
        pages: {
          where: { isActive: true, visibility: "PUBLIC" },
          select: { id: true, name: true, slug: true, type: true, logo: true, sector: true },
          take: 5,
        },
      },
    });

    if (!user) return null;

    const [viewerCtx, mutualCount] = await Promise.all([
      userId ? addViewerContext(userId, targetUserId) : null,
      userId ? getMutualConnectionCount(userId, targetUserId) : 0,
    ]);

    let matchScore = null;
    let matchReasons = [];
    if (userId) {
      const viewer = await db.user.findUnique({
        where: { id: userId },
        select: { ...USER_NETWORKING_SELECT, ...buildUserInclude() },
      });
      const result = ScoringService.computePeopleMatchScore(viewer, {
        ...user,
        _mutualCount: mutualCount,
      });
      matchScore = result.score;
      matchReasons = result.reasons;
    }

    return {
      ...user,
      mutualConnections: mutualCount,
      matchScore,
      matchReasons,
      viewerContext: viewerCtx,
    };
  },
};
