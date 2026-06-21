import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import {NotificationAudienceResolver} from "../../../../src/utils/notificationAudienceResolver.js"
import { NotificationService } from "../../common/notification.service.js";
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .substring(0, 80);
}

async function ensureUniqueSlug(baseSlug) {
  let slug = baseSlug;
  let counter = 0;
  while (true) {
    const exists = await db.community.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) return slug;
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

async function validateAdminPermission(communityId, userId, allowedRoles = ["OWNER", "ADMIN"]) {
  const member = await db.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId } },
    select: { role: true, isBanned: true },
  });
  if (!member) throw new ApiError(403, "You are not a member of this community");
  if (member.isBanned) throw new ApiError(403, "You are banned from this community");
  if (!allowedRoles.includes(member.role)) {
    throw new ApiError(403, "You don't have permission to perform this action");
  }
  return member;
}

const communitySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  about: true,
  coverImage: true,
  logo: true,
  category: true,
  visibility: true,
  tags: true,
  guidelines: true,
  website: true,
  location: true,
  industry: true,
  joinApproval: true,
  requireQuestions: true,
  requirePostApproval: true,
  maxMembers: true,
  bannerColor: true,
  isVerified: true,
  memberCount: true,
  postCount: true,
  weeklyActiveMembers: true,
  lastActivityAt: true,
  createdById: true,
  createdAt: true,
};

export const CommunityManagementService = {
  createCommunity: async (userId, data) => {
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, isActive: true } });
    if (!user || !user.isActive) throw new ApiError(400, "User account is not active");

    const slug = await ensureUniqueSlug(generateSlug(data.name));
    const channelSlug = "general";

    const community = await db.$transaction(async (tx) => {
      const created = await tx.community.create({
        data: {
          name: data.name,
          slug,
          description: data.description || null,
          about: data.about || null,
          coverImage: data.coverImage || null,
          logo: data.logo || null,
          category: data.category,
          visibility: data.visibility || "PUBLIC",
          tags: data.tags || [],
          guidelines: data.guidelines || null,
          website: data.website || null,
          location: data.location || null,
          industry: data.industry || null,
          joinApproval: data.joinApproval || false,
          requireQuestions: data.requireQuestions || false,
          requirePostApproval: data.requirePostApproval || false,
          maxMembers: data.maxMembers || null,
          bannerColor: data.bannerColor || null,
          createdById: userId,
          memberCount: 1,
          lastActivityAt: new Date(),
        },
        select: { ...communitySelect, id: true },
      });

      await tx.communityMember.create({
        data: {
          communityId: created.id,
          userId,
          role: "OWNER",
          isApproved: true,
          lastSeenAt: new Date(),
        },
      });

      await tx.communityChannel.create({
        data: {
          communityId: created.id,
          name: "General",
          slug: channelSlug,
          description: "General discussion",
          isDefault: true,
          orderIndex: 0,
        },
      });

      await tx.communityActivityLog.create({
        data: {
          communityId: created.id,
          userId,
          action: "COMMUNITY_CREATED",
          targetType: "COMMUNITY",
          targetId: created.id,
        },
      });

      return created;
    });

    const {recipientIds, actor} = await NotificationAudienceResolver.getFollowersAndConnections(userId);
    if (recipientIds.length > 0) {
      await NotificationService.sendBulk({
        recipientIds,
        type: "COMMUNITY_CREATED",
        category: "COMMUNITY",
        priority: "MEDIUM",
        title: "New Community Created",
        message: `created a new community "${community.name}".`,
        actorId: userId,
        actorName: `${actor.firstName} ${actor.lastName}`.trim(),
        actorAvatar: actor.profilePhoto,
        entityType: "Community",
        entityId: community.id,
        actionUrl: `/community/${community.slug}`,
        data: {
          communityId: community.id,
          communitySlug: community.slug,
          communityName: community.name,
          actorSlug: actor.username,
        },
      });
    }

    return community;
  },

  updateCommunity: async (userId, communityId, data) => {
    await validateAdminPermission(communityId, userId, ["OWNER", "ADMIN"]);

    const updateData = {};
    const fields = [
      "name", "description", "about", "coverImage", "logo", "category",
      "visibility", "tags", "guidelines", "website", "location", "industry",
      "joinApproval", "autoApproveMembers", "requireQuestions",
      "requirePostApproval", "maxMembers", "bannerColor",
    ];
    for (const field of fields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    if (data.name && data.name !== (await db.community.findUnique({ where: { id: communityId }, select: { name: true } }))?.name) {
      updateData.slug = await ensureUniqueSlug(generateSlug(data.name));
    }

    const community = await db.community.update({
      where: { id: communityId },
      data: updateData,
      select: communitySelect,
    });

    await db.communityActivityLog.create({
      data: {
        communityId,
        userId,
        action: "COMMUNITY_UPDATED",
        targetType: "COMMUNITY",
        targetId: communityId,
        metadata: { updatedFields: Object.keys(updateData) },
      },
    });

    const {recipientIds, actor} = await NotificationAudienceResolver.getFollowersAndConnections(userId);
    if (recipientIds.length > 0) {
      await NotificationService.sendBulk({
        recipientIds,
        type: "COMMUNITY_UPDATED",
        category: "COMMUNITY",
        priority: "LOW",
        title: "Community Updated",
        message: `updated the community "${community.name}".`,
        actorId: userId,
        actorName: `${actor.firstName} ${actor.lastName}`.trim(),
        actorAvatar: actor.profilePhoto,
        entityType: "Community",
        entityId: community.id,
        actionUrl: `/community/${community.slug}`,
        data: {
          communityId: community.id,
          communitySlug: community.slug,
          communityName: community.name,
          actorSlug: actor.username,
        },
      });
    }

    return community;
  },

  getCommunityBySlug: async (slug, viewerId) => {
    const community = await db.community.findUnique({
      where: { slug },
      select: {
        ...communitySelect,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            profilePhoto: true,
          },
        },
        channels: {
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            isDefault: true,
            isReadOnly: true,
            orderIndex: true,
          },
        },
        rules: {
          orderBy: { orderIndex: "asc" },
          select: {
            id: true,
            title: true,
            description: true,
            orderIndex: true,
          },
        },
        _count: {
          select: {
            posts: true,
            members: true,
          },
        },
      },
    });
  
    if (!community) {
      throw new ApiError(404, "Community not found");
    }
  
    if (
      community.visibility === "HIDDEN" &&
      community.createdById !== viewerId
    ) {
      const membership = viewerId
        ? await db.communityMember.findUnique({
            where: {
              communityId_userId: {
                communityId: community.id,
                userId: viewerId,
              },
            },
            select: { id: true },
          })
        : null;
  
      if (!membership) {
        throw new ApiError(404, "Community not found");
      }
    }
  
    let viewerMembership = null;
    let pendingRequest = null;
    let pendingInvite = null;
   
    if (viewerId) {
      viewerMembership = await db.communityMember.findUnique({
        where: {
          communityId_userId: {
            communityId: community.id,
            userId: viewerId,
          },
        },
        select: {
          id: true,
          role: true,
          isBanned: true,
          notificationPreference: true,
        },
      });

      if (!viewerMembership && (community.visibility === "PRIVATE" || community.joinApproval)){
        pendingRequest = await db.communityJoinRequest.findUnique({
          where: {
            communityId_userId: {
              communityId: community.id,
              userId: viewerId,
            },
          },
          select: {
            id: true,
            status: true,
          },
        });

        if (community.visibility === "PRIVATE") {
          pendingInvite = await db.communityInvite.findFirst({
            where: {
              communityId: community.id,
              inviteeUserId: viewerId,
              status: "PENDING",
              expiresAt: {
                gt: new Date(),
              },
            },
            select: {
              id: true,
              code:true,
            },
          });
        }
      }
    }
   
    return {
      ...community,
      viewerContext: {
        isMember: !!viewerMembership && !viewerMembership.isBanned,
        role: viewerMembership?.role || null,
        isBanned: viewerMembership?.isBanned || false,
        notificationPreference:
          viewerMembership?.notificationPreference || null,
          alreadyJoined: !!viewerMembership && !viewerMembership.isBanned,
        alreadyRequested:
        (community.visibility === "PRIVATE" || community.joinApproval) && 
          pendingRequest?.status === "PENDING",
        alreadyInvited:
          community.visibility === "PRIVATE" &&
          !!pendingInvite,
          inviteId:
          community.visibility === "PRIVATE"
            ? pendingInvite?.id || null
            : null,
        inviteCode:
          community.visibility === "PRIVATE"
            ? pendingInvite?.code || null
            : null,
      },
    };
  },

  deleteCommunity: async (userId, communityId) => {
    await validateAdminPermission(communityId, userId, ["OWNER"]);

    await db.$transaction(async (tx) => {
      await tx.communityActivityLog.deleteMany({ where: { communityId } });
      await tx.communityModerationQueue.deleteMany({ where: { communityId } });
      await tx.communityBanLog.deleteMany({ where: { communityId } });
      await tx.communityInvite.deleteMany({ where: { communityId } });
      await tx.communityJoinRequest.deleteMany({ where: { communityId } });
      await tx.communityJoinQuestion.deleteMany({ where: { communityId } });
      await tx.communityRule.deleteMany({ where: { communityId } });
      await tx.communityChannel.deleteMany({ where: { communityId } });
      await tx.communityMember.deleteMany({ where: { communityId } });
      await tx.community.delete({ where: { id: communityId } });
    });

    return { deleted: true };
  },

  transferOwnership: async (userId, communityId, newOwnerId) => {
    await validateAdminPermission(communityId, userId, ["OWNER"]);

    const newOwnerMember = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: newOwnerId } },
      select: { id: true, isBanned: true },
    });
    if (!newOwnerMember) throw new ApiError(404, "Target user is not a member of this community");
    if (newOwnerMember.isBanned) throw new ApiError(400, "Cannot transfer ownership to a banned member");

    await db.$transaction(async (tx) => {
      await tx.communityMember.update({
        where: { communityId_userId: { communityId, userId } },
        data: { role: "ADMIN" },
      });
      await tx.communityMember.update({
        where: { communityId_userId: { communityId, userId: newOwnerId } },
        data: { role: "OWNER" },
      });
      await tx.community.update({
        where: { id: communityId },
        data: { createdById: newOwnerId },
      });
      await tx.communityActivityLog.create({
        data: {
          communityId,
          userId,
          action: "OWNERSHIP_TRANSFERRED",
          targetType: "USER",
          targetId: newOwnerId,
        },
      });
    });

    return { transferred: true };
  },

  updateSettings: async (userId, communityId, data) => {
    await validateAdminPermission(communityId, userId, ["OWNER", "ADMIN"]);

    const updateData = {};
    const fields = ["joinApproval", "autoApproveMembers", "requireQuestions", "requirePostApproval", "maxMembers"];
    for (const field of fields) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    return db.community.update({
      where: { id: communityId },
      data: updateData,
      select: communitySelect,
    });
  },

  addChannel: async (userId, communityId, data) => {
    await validateAdminPermission(communityId, userId, ["OWNER", "ADMIN"]);

    const slug = generateSlug(data.name);
    const existing = await db.communityChannel.findUnique({
      where: { communityId_slug: { communityId, slug } },
    });
    if (existing) throw new ApiError(409, "A channel with this name already exists");

    const maxOrder = await db.communityChannel.aggregate({
      where: { communityId },
      _max: { orderIndex: true },
    });

    return db.communityChannel.create({
      data: {
        communityId,
        name: data.name,
        slug,
        description: data.description || null,
        isReadOnly: data.isReadOnly || false,
        orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
      },
      select: { id: true, name: true, slug: true, description: true, isDefault: true, isReadOnly: true, orderIndex: true },
    });
  },

  updateChannel: async (userId, channelId, data) => {
    const channel = await db.communityChannel.findUnique({
      where: { id: channelId },
      select: { id: true, communityId: true, isDefault: true },
    });
    if (!channel) throw new ApiError(404, "Channel not found");

    await validateAdminPermission(channel.communityId, userId, ["OWNER", "ADMIN"]);

    const updateData = {};
    if (data.name !== undefined) {
      updateData.name = data.name;
      updateData.slug = generateSlug(data.name);
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isReadOnly !== undefined) updateData.isReadOnly = data.isReadOnly;

    return db.communityChannel.update({
      where: { id: channelId },
      data: updateData,
      select: { id: true, name: true, slug: true, description: true, isDefault: true, isReadOnly: true, orderIndex: true },
    });
  },

  deleteChannel: async (userId, channelId) => {
    const channel = await db.communityChannel.findUnique({
      where: { id: channelId },
      select: { id: true, communityId: true, isDefault: true },
    });
    if (!channel) throw new ApiError(404, "Channel not found");
    if (channel.isDefault) throw new ApiError(400, "Cannot delete the default channel");

    await validateAdminPermission(channel.communityId, userId, ["OWNER", "ADMIN"]);

    await db.$transaction(async (tx) => {
      await tx.communityPost.updateMany({
        where: { channelId },
        data: { channelId: null },
      });
      await tx.communityChannel.delete({ where: { id: channelId } });
    });

    return { deleted: true };
  },

  reorderChannels: async (userId, communityId, orderedIds) => {
    await validateAdminPermission(communityId, userId, ["OWNER", "ADMIN"]);

    await db.$transaction(
      orderedIds.map((id, index) =>
        db.communityChannel.update({
          where: { id },
          data: { orderIndex: index },
        })
      )
    );

    return { reordered: true };
  },

  addRule: async (userId, communityId, data) => {
    await validateAdminPermission(communityId, userId, ["OWNER", "ADMIN"]);

    const maxOrder = await db.communityRule.aggregate({
      where: { communityId },
      _max: { orderIndex: true },
    });

    return db.communityRule.create({
      data: {
        communityId,
        title: data.title,
        description: data.description,
        orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
      },
      select: { id: true, title: true, description: true, orderIndex: true },
    });
  },

  updateRule: async (userId, ruleId, data) => {
    const rule = await db.communityRule.findUnique({
      where: { id: ruleId },
      select: { id: true, communityId: true },
    });
    if (!rule) throw new ApiError(404, "Rule not found");

    await validateAdminPermission(rule.communityId, userId, ["OWNER", "ADMIN"]);

    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;

    return db.communityRule.update({
      where: { id: ruleId },
      data: updateData,
      select: { id: true, title: true, description: true, orderIndex: true },
    });
  },

  deleteRule: async (userId, ruleId) => {
    const rule = await db.communityRule.findUnique({
      where: { id: ruleId },
      select: { id: true, communityId: true },
    });
    if (!rule) throw new ApiError(404, "Rule not found");

    await validateAdminPermission(rule.communityId, userId, ["OWNER", "ADMIN"]);
    await db.communityRule.delete({ where: { id: ruleId } });
    return { deleted: true };
  },

  reorderRules: async (userId, communityId, orderedIds) => {
    await validateAdminPermission(communityId, userId, ["OWNER", "ADMIN"]);

    await db.$transaction(
      orderedIds.map((id, index) =>
        db.communityRule.update({
          where: { id },
          data: { orderIndex: index },
        })
      )
    );

    return { reordered: true };
  },

  getMembershipRules: async (
    userId,
    communityId
  ) => {
    const adminMember =
      await db.communityMember.findUnique({
        where: {
          communityId_userId: {
            communityId,
            userId,
          },
        },
        select: {
          role: true,
        },
      });
  
    if (
      !adminMember ||
      !["OWNER", "ADMIN"].includes(adminMember.role)
    ) {
      throw new ApiError(
        403,
        "You don't have permission to view settings"
      );
    }
  
    const community = await db.community.findUnique({
        where: {
          id: communityId,
        },
        select: {
          id: true,
          joinApproval: true,
          requireQuestions: true,
          requirePostApproval: true,
          maxMembers: true,
        },
      });
  
    if (!community) {
      throw new ApiError(
        404,
        "Community not found"
      );
    }
  
    return community;
  },

  updateMembershipRules: async (
    userId,
    communityId,
    data
  ) => {
  
    const adminMember =
      await db.communityMember.findUnique({
        where: {
          communityId_userId: {
            communityId,
            userId,
          },
        },
        select: {
          role: true,
        },
      });
  
    if (
      !adminMember ||
      !["OWNER", "ADMIN"].includes(adminMember.role)
    ) {
      throw new ApiError(
        403,
        "You don't have permission to update settings"
      );
    }
  
    const community =
      await db.community.findUnique({
        where: {
          id: communityId,
        },
        select: {
          id: true,
        },
      });
  
    if (!community) {
      throw new ApiError(
        404,
        "Community not found"
      );
    }
  
    return db.community.update({
      where: {
        id: communityId,
      },
  
      data: {
        ...(data.joinApproval !== undefined && {
          joinApproval: data.joinApproval,
        }),
  
        ...(data.requireQuestions !== undefined && {
          requireQuestions: data.requireQuestions,
        }),
  
        ...(data.requirePostApproval !== undefined && {
          requirePostApproval: data.requirePostApproval,
        }),
  
        ...(data.maxMembers !== undefined && {
          maxMembers: data.maxMembers,
        }),
      },
  
      select: {
        id: true,
        joinApproval: true,
        requireQuestions: true,
        requirePostApproval: true,
        maxMembers: true,
      },
    });
  },
};

export { validateAdminPermission, communitySelect };
