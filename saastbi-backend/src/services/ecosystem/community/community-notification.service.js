import db from "../../../db/db.js";
import { NotificationService } from "../../common/notification.service.js";

export const CommunityNotificationService = {
  notifyNewPost: async (communityId, postId, authorId) => {
    const community = await db.community.findUnique({
      where: { id: communityId },
      select: { id: true, name: true },
    });
    if (!community) return;

    const author = await db.user.findUnique({
      where: { id: authorId },
      select: { firstName: true, lastName: true, profilePhoto: true },
    });

    const members = await db.communityMember.findMany({
      where: {
        communityId,
        userId: { not: authorId },
        isBanned: false,
        notificationPreference: "ALL",
      },
      select: { userId: true },
    });

    const recipientIds = members.map((m) => m.userId);

    NotificationService.sendBulk({
      recipientIds,
      type: "COMMUNITY_POST",
      category: "COMMUNITY",
      title: `New post in ${community.name}`,
      message: "A new post was shared in your community",
      data: { communityId, postId },
      actionUrl: `/community/${communityId}/post/${postId}`,
      actorId: authorId,
      actorName: author ? `${author.firstName} ${author.lastName}`.trim() : null,
      actorAvatar: author?.profilePhoto || null,
      entityType: "CommunityPost",
      entityId: postId,
    }).catch(() => {});
  },

  notifyMention: async (communityId, postId, mentionedUserIds, mentionerName) => {
    const community = await db.community.findUnique({
      where: { id: communityId },
      select: { name: true },
    });
    if (!community) return;

    NotificationService.sendBulk({
      recipientIds: mentionedUserIds,
      type: "COMMUNITY_MENTION",
      category: "COMMUNITY",
      title: `${mentionerName} mentioned you`,
      message: `You were mentioned in ${community.name}`,
      data: { communityId, postId },
      actionUrl: `/community/${communityId}/post/${postId}`,
      actorName: mentionerName,
      entityType: "CommunityPost",
      entityId: postId,
    }).catch(() => {});
  },

  notifyComment: async (postAuthorId, commenterId, postId, communityId, commentPreview) => {
    if (postAuthorId === commenterId) return;

    const commenter = await db.user.findUnique({
      where: { id: commenterId },
      select: { firstName: true, lastName: true, profilePhoto: true },
    });

    NotificationService.send({
      recipientId: postAuthorId,
      type: "COMMUNITY_COMMENT",
      category: "COMMUNITY",
      title: "New comment on your post",
      message: commentPreview.substring(0, 100),
      data: { communityId, postId },
      actionUrl: `/community/${communityId}/post/${postId}`,
      actorId: commenterId,
      actorName: commenter ? `${commenter.firstName} ${commenter.lastName}`.trim() : null,
      actorAvatar: commenter?.profilePhoto || null,
      entityType: "CommunityPost",
      entityId: postId,
    }).catch(() => {});
  },

  notifyJoinRequest: async (communityId, requesterId) => {
    const community = await db.community.findUnique({
      where: { id: communityId },
      select: { name: true },
    });
    if (!community) return;

    const requester = await db.user.findUnique({
      where: { id: requesterId },
      select: { firstName: true, lastName: true, profilePhoto: true },
    });

    const admins = await db.communityMember.findMany({
      where: { communityId, role: { in: ["OWNER", "ADMIN"] }, isBanned: false },
      select: { userId: true },
    });

    const recipientIds = admins.map((a) => a.userId);

    NotificationService.sendBulk({
      recipientIds,
      type: "COMMUNITY_JOIN_REQUEST",
      category: "COMMUNITY",
      title: "New join request",
      message: `${requester?.firstName || "Someone"} ${requester?.lastName || ""} wants to join ${community.name}`,
      data: { communityId, requesterId },
      actionUrl: `/community/${communityId}/members`,
      actorId: requesterId,
      actorName: requester ? `${requester.firstName} ${requester.lastName}`.trim() : null,
      actorAvatar: requester?.profilePhoto || null,
      entityType: "Community",
      entityId: communityId,
    }).catch(() => {});
  },

  notifyJoinApproved: async (communityId, userId) => {
    const community = await db.community.findUnique({
      where: { id: communityId },
      select: { name: true },
    });
    if (!community) return;

    NotificationService.send({
      recipientId: userId,
      type: "COMMUNITY_JOIN_APPROVED",
      category: "COMMUNITY",
      title: "Join request approved",
      message: `Your request to join ${community.name} has been approved`,
      data: { communityId },
      actionUrl: `/community/${communityId}`,
      entityType: "Community",
      entityId: communityId,
    }).catch(() => {});
  },

  notifyInvite: async (communityId, inviteeUserId, inviterName) => {
    if (!inviteeUserId) return;

    const community = await db.community.findUnique({
      where: { id: communityId },
      select: { name: true },
    });
    if (!community) return;

    NotificationService.send({
      recipientId: inviteeUserId,
      type: "COMMUNITY_INVITE",
      category: "COMMUNITY",
      title: "Community invitation",
      message: `${inviterName} invited you to join ${community.name}`,
      data: { communityId },
      actionUrl: `/community/${communityId}`,
      actorName: inviterName,
      entityType: "Community",
      entityId: communityId,
    }).catch(() => {});
  },

  notifyModeration: async (communityId, reportType) => {
    const community = await db.community.findUnique({
      where: { id: communityId },
      select: { name: true },
    });
    if (!community) return;

    const mods = await db.communityMember.findMany({
      where: { communityId, role: { in: ["OWNER", "ADMIN", "MODERATOR"] }, isBanned: false },
      select: { userId: true },
    });

    const recipientIds = mods.map((m) => m.userId);

    NotificationService.sendBulk({
      recipientIds,
      type: "SYSTEM",
      category: "COMMUNITY",
      priority: "HIGH",
      title: "New content report",
      message: `A ${reportType} has been reported in ${community.name}`,
      data: { communityId },
      actionUrl: `/community/${communityId}/moderation`,
      entityType: "Community",
      entityId: communityId,
    }).catch(() => {});
  },
};
