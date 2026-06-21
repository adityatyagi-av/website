import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";

async function validateAnalyticsAccess(communityId, userId) {
  const member = await db.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId } },
    select: { role: true },
  });
  if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
    throw new ApiError(403, "Only owners and admins can view analytics");
  }
}

export const CommunityAnalyticsService = {
  getCommunityOverview: async (userId, communityId) => {
    await validateAnalyticsAccess(communityId, userId);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      community,
      totalPosts,
      weeklyPosts,
      monthlyPosts,
      totalComments,
      weeklyMembers,
      activeThisWeek,
      pendingRequests,
      pendingReports,
    ] = await Promise.all([
      db.community.findUnique({
        where: { id: communityId },
        select: { memberCount: true, postCount: true, weeklyActiveMembers: true, createdAt: true },
      }),
      db.communityPost.count({ where: { communityId, isApproved: true } }),
      db.communityPost.count({ where: { communityId, isApproved: true, createdAt: { gte: weekAgo } } }),
      db.communityPost.count({ where: { communityId, isApproved: true, createdAt: { gte: monthAgo } } }),
      db.communityComment.count({ where: { post: { communityId } } }),
      db.communityMember.count({ where: { communityId, isBanned: false, joinedAt: { gte: weekAgo } } }),
      db.communityMember.count({ where: { communityId, isBanned: false, lastSeenAt: { gte: weekAgo } } }),
      db.communityJoinRequest.count({ where: { communityId, status: "PENDING" } }),
      db.communityModerationQueue.count({ where: { communityId, status: "PENDING" } }),
    ]);

    return {
      totalMembers: community.memberCount,
      totalPosts,
      totalComments,
      weeklyPosts,
      monthlyPosts,
      newMembersThisWeek: weeklyMembers,
      activeThisWeek,
      weeklyActiveMembers: community.weeklyActiveMembers,
      pendingRequests,
      pendingReports,
      createdAt: community.createdAt,
    };
  },

  getMemberGrowthChart: async (userId, communityId, query) => {
    await validateAnalyticsAccess(communityId, userId);

    const period = query.period || "30d";
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const members = await db.communityMember.findMany({
      where: { communityId, isBanned: false, joinedAt: { gte: startDate } },
      select: { joinedAt: true },
      orderBy: { joinedAt: "asc" },
    });

    const dailyCounts = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split("T")[0];
      dailyCounts[key] = 0;
    }

    for (const m of members) {
      const key = m.joinedAt.toISOString().split("T")[0];
      if (dailyCounts[key] !== undefined) dailyCounts[key]++;
    }

    return Object.entries(dailyCounts).map(([date, count]) => ({ date, count }));
  },

  getEngagementMetrics: async (userId, communityId) => {
    await validateAnalyticsAccess(communityId, userId);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const recentPosts = await db.communityPost.findMany({
      where: { communityId, isApproved: true, createdAt: { gte: weekAgo } },
      select: { likeCount: true, commentCount: true, viewCount: true, shareCount: true },
    });

    const totalLikes = recentPosts.reduce((s, p) => s + p.likeCount, 0);
    const totalComments = recentPosts.reduce((s, p) => s + p.commentCount, 0);
    const totalViews = recentPosts.reduce((s, p) => s + p.viewCount, 0);
    const totalShares = recentPosts.reduce((s, p) => s + p.shareCount, 0);
    const count = recentPosts.length || 1;

    const topPosts = await db.communityPost.findMany({
      where: { communityId, isApproved: true },
      orderBy: { likeCount: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        content: true,
        postType: true,
        likeCount: true,
        commentCount: true,
        viewCount: true,
        createdAt: true,
        author: {
          select: { id: true, firstName: true, lastName: true, username: true, profilePhoto: true },
        },
      },
    });

    return {
      weeklyStats: {
        totalPosts: recentPosts.length,
        totalLikes,
        totalComments,
        totalViews,
        totalShares,
        avgLikesPerPost: Math.round(totalLikes / count * 10) / 10,
        avgCommentsPerPost: Math.round(totalComments / count * 10) / 10,
        avgViewsPerPost: Math.round(totalViews / count * 10) / 10,
      },
      topPosts,
    };
  },

  getTopContributors: async (userId, communityId, query) => {
    await validateAnalyticsAccess(communityId, userId);

    const limit = query.limit || 10;

    const contributors = await db.communityMember.findMany({
      where: { communityId, isBanned: false },
      orderBy: { contributionScore: "desc" },
      take: limit,
      select: {
        role: true,
        contributionScore: true,
        joinedAt: true,
        lastSeenAt: true,
        user: {
          select: { id: true, firstName: true, lastName: true, username: true, profilePhoto: true, headline: true },
        },
      },
    });

    const enriched = await Promise.all(
      contributors.map(async (c) => {
        const [postCount, commentCount] = await Promise.all([
          db.communityPost.count({ where: { communityId, authorId: c.user.id, isApproved: true } }),
          db.communityComment.count({ where: { authorId: c.user.id, post: { communityId } } }),
        ]);
        return { ...c, postCount, commentCount };
      })
    );

    return enriched;
  },

  getContentBreakdown: async (userId, communityId) => {
    await validateAnalyticsAccess(communityId, userId);

    const postTypes = ["TEXT", "IMAGE", "VIDEO", "POLL", "LINK", "ARTICLE", "QUESTION", "ANNOUNCEMENT"];

    const breakdown = await Promise.all(
      postTypes.map(async (type) => {
        const count = await db.communityPost.count({
          where: { communityId, postType: type, isApproved: true },
        });
        return { type, count };
      })
    );

    const channels = await db.communityChannel.findMany({
      where: { communityId },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { posts: { where: { isApproved: true } } } },
      },
    });

    return { postTypeBreakdown: breakdown.filter((b) => b.count > 0), channelBreakdown: channels };
  },

  getMemberRetention: async (userId, communityId) => {
    await validateAnalyticsAccess(communityId, userId);

    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const d90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [total, active7d, active30d, active90d] = await Promise.all([
      db.communityMember.count({ where: { communityId, isBanned: false } }),
      db.communityMember.count({ where: { communityId, isBanned: false, lastSeenAt: { gte: d7 } } }),
      db.communityMember.count({ where: { communityId, isBanned: false, lastSeenAt: { gte: d30 } } }),
      db.communityMember.count({ where: { communityId, isBanned: false, lastSeenAt: { gte: d90 } } }),
    ]);

    return {
      totalMembers: total,
      active7d,
      active30d,
      active90d,
      retention7d: total > 0 ? Math.round((active7d / total) * 100) : 0,
      retention30d: total > 0 ? Math.round((active30d / total) * 100) : 0,
      retention90d: total > 0 ? Math.round((active90d / total) * 100) : 0,
    };
  },
};
