import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";

const communityCardSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  coverImage: true,
  logo: true,
  category: true,
  visibility: true,
  tags: true,
  isVerified: true,
  memberCount: true,
  postCount: true,
  weeklyActiveMembers: true,
  lastActivityAt: true,
  createdAt: true,
};

export const CommunityDiscoveryService = {
  discoverCommunities: async (viewerId, query) => {
    const { skip, take } = buildQueryOptions({
      page: query.page,
      limit: query.limit,
    });

    let joinedCommunityIds = [];
    let requestedCommunityIds = [];

    if (viewerId) {
      const memberships = await db.communityMember.findMany({
        where: {
          userId: viewerId,
          isBanned: false,
        },
        select: {
          communityId: true,
        },
      });

      
      const requests = await db.communityJoinRequest.findMany({
        where: {
          userId: viewerId,
          status: "PENDING",
        },
        select: {
          communityId: true,
        },
      });

      requestedCommunityIds = requests.map(
        (request) => request.communityId
      );

      joinedCommunityIds = memberships.map(
        (membership) => membership.communityId
      );
    }

    const where = { visibility: "PUBLIC", isSuspended: false,
      ...(viewerId && {
        id: {
          notIn: joinedCommunityIds,
        },
      }),
     };
    if (query.category) where.category = query.category;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { tags: { hasSome: [query.search.toLowerCase()] } },
      ];
    }

    let orderBy = { memberCount: "desc" };
    if (query.sortBy === "activity") orderBy = { lastActivityAt: "desc" };
    if (query.sortBy === "newest") orderBy = { createdAt: "desc" };

    const [communities, total] = await Promise.all([
      db.community.findMany({
        where,
        orderBy,
        skip,
        take,
        select: communityCardSelect,
      }),
      db.community.count({ where }),
    ]);

    const requestedCommunitySet = new Set(requestedCommunityIds);
    const enriched = communities.map((community) => ({
      ...community,
      hasRequested: requestedCommunitySet.has(community.id),
    }));

    return {
      communities: enriched,
      total,
      page: query.page || 1,
      limit: query.limit || 10,
    };
  },

  getTrendingCommunities: async (viewerId, query) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const limit = Number(query.limit) || 10;

    const communities = await db.community.findMany({
      where: {
        visibility: "PUBLIC",
        isSuspended: false,
        lastActivityAt: { gte: sevenDaysAgo },
      },
      orderBy: [{ weeklyActiveMembers: "desc" }, { postCount: "desc" }],
      take: limit,
      select: communityCardSelect,
    });

    let joinedCommunityIds = new Set();
    if (viewerId) {
      const memberships = await db.communityMember.findMany({
        where: {
          userId: viewerId,
          communityId: { in: communities.map((c) => c.id) },
        },
        select: { communityId: true },
      });
      joinedCommunityIds = new Set(memberships.map((m) => m.communityId));
    }

    return communities.map((c) => ({
      ...c,
      isMember: joinedCommunityIds.has(c.id),
      isCreatedByMe: viewerId ? c.createdById === viewerId : false,
    }));
  },

  getRecommendedCommunities: async (userId, query) => {
    const limit = Number(query.limit) || 10;

    const userMemberships = await db.communityMember.findMany({
      where: { userId },
      select: { communityId: true },
    });
    const joinedIds = userMemberships.map((m) => m.communityId);

    const userSkills = await db.userSkill.findMany({
      where: { userId },
      select: {
        skill: {
          select: {
            name: true,
          },
        },
      },
    });
    const skillNames = userSkills
      .map((s) => s.skill?.name?.toLowerCase())
      .filter(Boolean);

    const userRoles = await db.userRole.findMany({
      where: { userId },
      select: { roleType: true },
    });
    const roleTypes = userRoles.map((r) => r.roleType);

    const following = await db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);

    let followingCommunities = [];
    if (followingIds.length > 0) {
      followingCommunities = await db.communityMember.findMany({
        where: {
          userId: { in: followingIds },
          communityId: { notIn: joinedIds },
          community: { visibility: "PUBLIC", isSuspended: false },
        },
        select: { communityId: true },
        distinct: ["communityId"],
        take: 20,
      });
    }

    const followingCommunityIds = followingCommunities.map(
      (c) => c.communityId,
    );

    const tagBasedCommunities =
      skillNames.length > 0
        ? await db.community.findMany({
            where: {
              id: { notIn: joinedIds },
              visibility: "PUBLIC",
              isSuspended: false,
              tags: { hasSome: skillNames },
            },
            select: { id: true },
            take: 20,
          })
        : [];
    const tagBasedIds = tagBasedCommunities.map((c) => c.id);

    const allCandidateIds = [
      ...new Set([...followingCommunityIds, ...tagBasedIds]),
    ];

    if (allCandidateIds.length === 0) {
      return db.community.findMany({
        where: {
          visibility: "PUBLIC",
          isSuspended: false,
          id: { notIn: joinedIds },
        },
        orderBy: { memberCount: "desc" },
        take: limit,
        select: communityCardSelect,
      });
    }

    const communities = await db.community.findMany({
      where: { id: { in: allCandidateIds } },
      orderBy: { memberCount: "desc" },
      take: limit,
      select: communityCardSelect,
    });

    return communities;
  },

  getCommunitiesByCategory: async (viewerId) => {
    const categories = [
      "TECHNOLOGY",
      "STARTUP",
      "DESIGN",
      "MARKETING",
      "FINANCE",
      "HEALTHCARE",
      "EDUCATION",
      "AI_ML",
      "BLOCKCHAIN",
      "SUSTAINABILITY",
      "CAREER",
      "GENERAL",
    ];

    const results = await Promise.all(
      categories.map(async (category) => {
        const communities = await db.community.findMany({
          where: { category, visibility: "PUBLIC", isSuspended: false },
          orderBy: { memberCount: "desc" },
          take: 5,
          select: communityCardSelect,
        });
        const total = await db.community.count({
          where: { category, visibility: "PUBLIC", isSuspended: false },
        });
        return { category, communities, total };
      }),
    );

    return results.filter((r) => r.total > 0);
  },

  getMyCommunities: async (userId, query) => {
    const { skip, take } = buildQueryOptions({
      page: query.page,
      limit: query.limit,
    });

    const where = { userId, isBanned: false };

    const [memberships, total] = await Promise.all([
      db.communityMember.findMany({
        where,
        orderBy: { lastSeenAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          role: true,
          joinedAt: true,
          lastSeenAt: true,
          notificationPreference: true,
          community: {
            select: {
              ...communityCardSelect,
              _count: {
                select: {
                  posts: { where: { isApproved: true, isArchived: false } },
                },
              },
            },
          },
        },
      }),
      db.communityMember.count({ where }),
    ]);

    return {
      memberships,
      total,
      page: query.page || 1,
      limit: query.limit || 10,
    };
  },

  getCommunityPreview: async (communityId, query) => {
    const { skip, take } = buildQueryOptions({
      page: query.page || 1,
      limit: query.limit || 6,
    });

    const members = await db.communityMember.findMany({
      where: { communityId, isBanned: false },
      orderBy: { contributionScore: "desc" },
      skip,
      take,
      select: {
        role: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            profilePhoto: true,
            headline: true,
          },
        },
      },
    });

    return members;
  },
};
