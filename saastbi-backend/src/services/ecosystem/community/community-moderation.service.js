import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";

async function validateModPermission(communityId, userId) {
  const member = await db.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId } },
    select: { role: true },
  });
  if (!member || !["OWNER", "ADMIN", "MODERATOR"].includes(member.role)) {
    throw new ApiError(403, "You don't have moderation permissions");
  }
  return member;
}

export const CommunityModerationService = {
  getModerationQueue: async (userId, communityId, query) => {
    await validateModPermission(communityId, userId);

    const { skip, take } = buildQueryOptions({ page: query.page, limit: query.limit });

    const where = { communityId };
    if (query.status) where.status = query.status;
    else where.status = "PENDING";

    const [items, total] = await Promise.all([
      db.communityModerationQueue.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip,
        take,
        select: {
          id: true,
          postId: true,
          commentId: true,
          reason: true,
          description: true,
          status: true,
          reviewedBy: true,
          reviewedAt: true,
          resolution: true,
          createdAt: true,
          reporterId: true,
        },
      }),
      db.communityModerationQueue.count({ where }),
    ]);

    const enriched = await Promise.all(
      items.map(async (item) => {
        const reporter = await db.user.findUnique({
          where: { id: item.reporterId },
          select: { id: true, firstName: true, lastName: true, username: true, profilePhoto: true },
        });

        let content = null;
        if (item.postId) {
          content = await db.communityPost.findUnique({
            where: { id: item.postId },
            select: {
              id: true,
              content: true,
              postType: true,
              authorId: true,
              author: { select: { id: true, firstName: true, lastName: true, username: true } },
            },
          });
        } else if (item.commentId) {
          content = await db.communityComment.findUnique({
            where: { id: item.commentId },
            select: {
              id: true,
              content: true,
              authorId: true,
              author: { select: { id: true, firstName: true, lastName: true, username: true } },
            },
          });
        }

        return { ...item, reporter, content, contentType: item.postId ? "POST" : "COMMENT" };
      })
    );

    return { items: enriched, total, page: query.page || 1, limit: query.limit || 10 };
  },

  reviewReport: async (userId, reportId, data) => {
    const report = await db.communityModerationQueue.findUnique({
      where: { id: reportId },
      select: { id: true, communityId: true, postId: true, commentId: true, status: true },
    });
    if (!report) throw new ApiError(404, "Report not found");

    await validateModPermission(report.communityId, userId);

    if (report.status !== "PENDING" && report.status !== "UNDER_REVIEW") {
      throw new ApiError(400, "This report has already been resolved");
    }

    await db.communityModerationQueue.update({
      where: { id: reportId },
      data: {
        status: data.status,
        reviewedBy: userId,
        reviewedAt: new Date(),
        resolution: data.resolution || null,
      },
    });

    await db.communityActivityLog.create({
      data: {
        communityId: report.communityId,
        userId,
        action: "REPORT_REVIEWED",
        targetType: "REPORT",
        targetId: reportId,
        metadata: { status: data.status, resolution: data.resolution },
      },
    });

    return { reviewed: true, status: data.status };
  },

  getActivityLog: async (userId, communityId, query) => {
    await validateModPermission(communityId, userId);

    const { skip, take } = buildQueryOptions({ page: query.page, limit: query.limit });

    const where = { communityId };
    if (query.action) where.action = query.action;
    if (query.userId) where.userId = query.userId;

    const [logs, total] = await Promise.all([
      db.communityActivityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          action: true,
          targetType: true,
          targetId: true,
          metadata: true,
          createdAt: true,
          userId: true,
        },
      }),
      db.communityActivityLog.count({ where }),
    ]);

    const userIds = [...new Set(logs.map((l) => l.userId))];
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, username: true, profilePhoto: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const enrichedLogs = logs.map((l) => ({ ...l, user: userMap.get(l.userId) || null }));

    return { logs: enrichedLogs, total, page: query.page || 1, limit: query.limit || 10 };
  },

  bulkModerate: async (userId, communityId, itemIds, action, type) => {
    await validateModPermission(communityId, userId);

    const results = { success: 0, failed: 0 };

    if (type === "posts") {
      for (const id of itemIds) {
        try {
          if (action === "approve") {
            await db.$transaction(async (tx) => {
              await tx.communityPost.update({ where: { id }, data: { isApproved: true } });
              await tx.community.update({
                where: { id: communityId },
                data: { postCount: { increment: 1 }, lastActivityAt: new Date() },
              });
            });
          } else {
            await db.communityPost.update({ where: { id }, data: { isArchived: true, isApproved: false } });
          }
          results.success++;
        } catch {
          results.failed++;
        }
      }
    } else if (type === "reports") {
      const status = action === "approve" ? "RESOLVED" : "DISMISSED";
      for (const id of itemIds) {
        try {
          await db.communityModerationQueue.update({
            where: { id },
            data: { status, reviewedBy: userId, reviewedAt: new Date() },
          });
          results.success++;
        } catch {
          results.failed++;
        }
      }
    }

    return results;
  },

  getMemberModerationHistory: async (userId, communityId, targetUserId) => {
    await validateModPermission(communityId, userId);

    const banLogs = await db.communityBanLog.findMany({
      where: { communityId, userId: targetUserId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        reason: true,
        duration: true,
        expiresAt: true,
        createdAt: true,
        performedBy: {
          select: { id: true, firstName: true, lastName: true, username: true },
        },
      },
    });

    const reports = await db.communityModerationQueue.findMany({
      where: {
        communityId,
        OR: [
          { postId: { in: (await db.communityPost.findMany({ where: { communityId, authorId: targetUserId }, select: { id: true } })).map((p) => p.id) } },
          { commentId: { in: (await db.communityComment.findMany({ where: { authorId: targetUserId, post: { communityId } }, select: { id: true } })).map((c) => c.id) } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, reason: true, status: true, description: true, createdAt: true },
    });

    return { banLogs, reports };
  },
};
