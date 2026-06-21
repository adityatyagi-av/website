import db from "../../../db/db.js";
import { getRedis, setRedis } from "../../../config/redisClient.js";
import {
  USER_NETWORKING_SELECT,
  getBlockedUserIds,
  addViewerContext,
  getMutualConnectionCount,
} from "./helpers.js";

const SUGGESTION_CACHE_TTL = 15 * 60;

export const SuggestionService = {
  getSuggestions: async (userId, query) => {
    const { limit = 10 } = query;
    const take = parseInt(limit);

    const cacheKey = `networking:suggestions:${userId}:${take}`;
    const cached = await getRedis(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }

    const [userConnections, userFollowing, blockedIds] = await Promise.all([
      db.connection.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
        select: { senderId: true, receiverId: true },
      }),
      db.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      }),
      getBlockedUserIds(userId),
    ]);

    const connectedIds = userConnections.map((c) =>
      c.senderId === userId ? c.receiverId : c.senderId
    );
    const followingIds = userFollowing.map((f) => f.followingId);
    const excludeIds = new Set([userId, ...connectedIds, ...blockedIds]);

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const pendingOrRecentlyRejected = await db.connection.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        AND: [
          {
            OR: [
              { status: "PENDING" },
              { status: "REJECTED", updatedAt: { gte: oneWeekAgo } },
            ],
          },
        ],
      },
      select: { senderId: true, receiverId: true },
    });
    pendingOrRecentlyRejected.forEach((r) => {
      excludeIds.add(r.senderId === userId ? r.receiverId : r.senderId);
    });

    if (connectedIds.length === 0) {
      const popularUsers = await db.user.findMany({
        where: {
          isActive: true,
          id: { notIn: [...excludeIds] },
          profileCurrentStage: { gte: 3 },
        },
        select: {
          ...USER_NETWORKING_SELECT,
          location: { select: { city: true, country: true } },
          roles: { select: { roleType: true, isVerified: true } },
          _count: { select: { followers: true } },
        },
        orderBy: { followers: { _count: "desc" } },
        take,
      });

      const results = popularUsers.map((u) => ({
        ...u,
        mutualConnections: 0,
        reasons: ["Popular in the community"],
      }));

      await setRedis(cacheKey, JSON.stringify(results), SUGGESTION_CACHE_TTL);
      return results;
    }

    const secondDegreeConnections = await db.connection.findMany({
      where: {
        status: "ACCEPTED",
        OR: [
          { senderId: { in: connectedIds } },
          { receiverId: { in: connectedIds } },
        ],
      },
      select: { senderId: true, receiverId: true },
    });

    const candidateScores = {};
    secondDegreeConnections.forEach((c) => {
      const otherId = connectedIds.includes(c.senderId) ? c.receiverId : c.senderId;
      if (!excludeIds.has(otherId)) {
        candidateScores[otherId] = (candidateScores[otherId] || 0) + 1;
      }
    });

    followingIds.forEach((id) => {
      if (!excludeIds.has(id) && !candidateScores[id]) {
        candidateScores[id] = 0.5;
      }
    });

    const sortedCandidateIds = Object.entries(candidateScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, take * 2)
      .map(([id]) => id);

    if (sortedCandidateIds.length === 0) {
      await setRedis(cacheKey, JSON.stringify([]), SUGGESTION_CACHE_TTL);
      return [];
    }

    const candidates = await db.user.findMany({
      where: {
        id: { in: sortedCandidateIds },
        isActive: true,
        profileCurrentStage: { gte: 3 },
      },
      select: {
        ...USER_NETWORKING_SELECT,
        location: { select: { city: true, country: true } },
        roles: { select: { roleType: true, isVerified: true } },
        skills: {
          select: { skill: { select: { name: true } } },
          take: 5,
        },
        _count: { select: { followers: true } },
      },
    });

    const viewer = await db.user.findUnique({
      where: { id: userId },
      select: {
        location: { select: { city: true, country: true } },
        skills: { select: { skill: { select: { name: true } } } },
      },
    });

    const enriched = await Promise.all(
      candidates.map(async (c) => {
        const mutualCount = candidateScores[c.id] || 0;
        const reasons = [];

        if (mutualCount >= 1) {
          reasons.push(`${Math.floor(mutualCount)} mutual connections`);
        }

        if (viewer?.location?.city && c.location?.city &&
            viewer.location.city.toLowerCase() === c.location.city.toLowerCase()) {
          reasons.push(`Based in ${c.location.city}`);
        }

        const viewerSkills = viewer?.skills?.map((s) => s.skill?.name?.toLowerCase()) || [];
        const candidateSkills = c.skills?.map((s) => s.skill?.name?.toLowerCase()) || [];
        const sharedSkills = viewerSkills.filter((s) => candidateSkills.includes(s));
        if (sharedSkills.length > 0) {
          reasons.push(`Shared skills: ${sharedSkills.slice(0, 2).join(", ")}`);
        }

        if (reasons.length === 0) reasons.push("You may know this person");

        return {
          ...c,
          mutualConnections: Math.floor(mutualCount),
          reasons,
        };
      })
    );

    enriched.sort((a, b) => b.mutualConnections - a.mutualConnections);
    const results = enriched.slice(0, take);

    await setRedis(cacheKey, JSON.stringify(results), SUGGESTION_CACHE_TTL);
    return results;
  },

  getMyNetwork: async (userId, query) => {
    const { page = 1, limit = 10 } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [pendingReceived, recentConnections, suggestions] = await Promise.all([
      db.connection.findMany({
        where: { receiverId: userId, status: "PENDING" },
        select: {
          id: true,
          message: true,
          createdAt: true,
          sender: {
            select: {
              ...USER_NETWORKING_SELECT,
              location: { select: { city: true, country: true } },
              roles: { select: { roleType: true, isVerified: true } },
              _count: { select: { followers: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.connection.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
        orderBy: { respondedAt: "desc" },
        take: 10,
        select: {
          id: true,
          respondedAt: true,
          senderId: true,
          receiverId: true,
          sender: {
            select: {
              ...USER_NETWORKING_SELECT,
              roles: { select: { roleType: true, isVerified: true } },
            },
          },
          receiver: {
            select: {
              ...USER_NETWORKING_SELECT,
              roles: { select: { roleType: true, isVerified: true } },
            },
          },
        },
      }),
      SuggestionService.getSuggestions(userId, { limit: 6 }),
    ]);

    const recentConnectionUsers = recentConnections.map((c) => ({
      connection: c,
      user: c.senderId === userId ? c.receiver : c.sender,
      connectedAt: c.respondedAt,
    }));

    return {
      pendingRequests: { count: pendingReceived.length, data: pendingReceived },
      recentConnections: recentConnectionUsers,
      suggestions,
    };
  },
};
