import db from "../../../db/db.js";
import { getRedis, setRedis, deleteRedis } from "../../../config/redisClient.js";
import {
  USER_NETWORKING_SELECT,
  buildPagination,
  getBlockedUserIds,
  addViewerContext,
  getMutualConnectionCount,
} from "./helpers.js";
import { ScoringService } from "./scoring.service.js";

const CACHE_TTL = 10 * 60;

const buildCofounderInclude = () => ({
  location: { select: { city: true, state: true, country: true } },
  roles: { select: { roleType: true, isPrimary: true, isVerified: true, isPublic: true } },
  skills: {
    select: { skill: { select: { id: true, name: true, category: true } }, proficiency: true },
    take: 15,
  },
  cofounderPreference: true,
  experiences: {
    select: { title: true, companyName: true, isCurrent: true },
    where: { isCurrent: true },
    take: 2,
  },
  _count: { select: { followers: true, following: true } },
});

export const CofounderService = {
  getCofounderMatches: async (userId, query) => {
    const {
      search,
      sector,
      commitment,
      location,
      remoteOk,
      stagePreference,
      sortBy = "relevance",
      page = 1,
      limit = 12,
    } = query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const viewer = await db.user.findUnique({
      where: { id: userId },
      select: { ...USER_NETWORKING_SELECT, ...buildCofounderInclude() },
    });

    const viewerPref = viewer?.cofounderPreference;

    const blockedIds = await getBlockedUserIds(userId);
    const excludeIds = [userId, ...blockedIds];

    const dismissed = await db.networkingMatch.findMany({
      where: { userId, matchType: "COFOUNDER", isDismissed: true },
      select: { targetUserId: true },
    });
    excludeIds.push(...dismissed.map((d) => d.targetUserId));

    const where = {
      isActive: true,
      id: { notIn: excludeIds },
      cofounderPreference: { isActive: true },
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { headline: { contains: search, mode: "insensitive" } },
      ];
    }

    if (sector) {
      where.cofounderPreference.sectors = { has: sector };
    }

    if (commitment) {
      where.cofounderPreference.commitment = commitment;
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

    if (remoteOk === "true") {
      where.cofounderPreference.remoteOk = true;
    }

    if (stagePreference) {
      where.cofounderPreference.stagePreference = { has: stagePreference };
    }

    const fetchLimit = take * 4;

    const [candidates, total] = await Promise.all([
      db.user.findMany({
        where,
        select: { ...USER_NETWORKING_SELECT, ...buildCofounderInclude() },
        take: fetchLimit,
        orderBy: { lastActive: "desc" },
      }),
      db.user.count({ where }),
    ]);

    const scored = await Promise.all(
      candidates.map(async (candidate) => {
        const mutualCount = await getMutualConnectionCount(userId, candidate.id);
        candidate._mutualCount = mutualCount;
        const candidatePref = candidate.cofounderPreference;
        const { score, reasons } = ScoringService.computeCofounderScore(
          viewer, candidate, viewerPref, candidatePref
        );
        return { ...candidate, _matchScore: score, _matchReasons: reasons, _mutualCount: mutualCount };
      })
    );

    scored.sort((a, b) => b._matchScore - a._matchScore);
    const paged = scored.slice(skip, skip + take);

    const enriched = await Promise.all(
      paged.map(async (user) => {
        const viewerCtx = await addViewerContext(userId, user.id);

        const tags = [];
        if (user.cofounderPreference?.remoteOk) tags.push("Remote OK");
        if (user.cofounderPreference?.commitment) tags.push(user.cofounderPreference.commitment.replace("_", " "));
        if (user.roles?.some((r) => r.isVerified)) tags.push("Verified");

        return {
          ...user,
          mutualConnections: user._mutualCount,
          matchScore: user._matchScore,
          matchReasons: user._matchReasons,
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

  getCofounderProfile: async (userId, targetUserId) => {
    const target = await db.user.findUnique({
      where: { id: targetUserId, isActive: true },
      select: {
        ...USER_NETWORKING_SELECT,
        ...buildCofounderInclude(),
        educations: {
          select: { degree: true, fieldOfStudy: true, institution: true, startDate: true, endDate: true },
          orderBy: { startDate: "desc" },
          take: 3,
        },
        pages: {
          where: { isActive: true, type: "STARTUP" },
          select: { id: true, name: true, slug: true, logo: true, sector: true, stage: true },
          take: 3,
        },
      },
    });

    if (!target || !target.cofounderPreference?.isActive) return null;

    const viewer = await db.user.findUnique({
      where: { id: userId },
      select: { ...USER_NETWORKING_SELECT, ...buildCofounderInclude() },
    });

    const mutualCount = await getMutualConnectionCount(userId, targetUserId);
    target._mutualCount = mutualCount;

    const { score, reasons } = ScoringService.computeCofounderScore(
      viewer, target, viewer?.cofounderPreference, target.cofounderPreference
    );

    const viewerCtx = await addViewerContext(userId, targetUserId);

    return {
      ...target,
      mutualConnections: mutualCount,
      matchScore: score,
      matchReasons: reasons,
      viewerContext: viewerCtx,
    };
  },

  upsertCofounderPreferences: async (userId, data) => {
    const preference = await db.cofounderPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    await deleteRedis(`networking:cofounder:${userId}`).catch(() => {});
    return preference;
  },

  getCofounderPreferences: async (userId) => {
    return db.cofounderPreference.findUnique({ where: { userId } });
  },
};
