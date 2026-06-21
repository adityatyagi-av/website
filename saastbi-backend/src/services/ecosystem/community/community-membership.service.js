import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";
import { v4 as uuidv4 } from "uuid";
import { NotificationService } from "../../common/notification.service.js";
const memberUserSelect = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    username: true,
    profilePhoto: true,
    headline: true,
  },
};

export const CommunityMembershipService = {
  joinCommunity: async (userId, communityId) => {
    const community = await db.community.findUnique({
      where: { id: communityId },
      select: { id: true, visibility: true, joinApproval: true, requireQuestions: true, maxMembers: true, memberCount: true, isSuspended: true },
    });
    if (!community) throw new ApiError(404, "Community not found");
    if (community.isSuspended) throw new ApiError(400, "This community is currently suspended");
    if (community.visibility === "HIDDEN") throw new ApiError(404, "Community not found");
    if (community.maxMembers && community.memberCount >= community.maxMembers) {
      throw new ApiError(400, "This community has reached its member limit");
    }

    const existing = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
      select: { id: true, isBanned: true },
    });
    if (existing) {
      if (existing.isBanned) throw new ApiError(403, "You are banned from this community");
      throw new ApiError(409, "You are already a member of this community");
    }

    if (community.joinApproval || community.visibility === "PRIVATE") {
      const existingRequest = await db.communityJoinRequest.findUnique({
        where: { communityId_userId: { communityId, userId } },
        select: { id: true, status: true },
      });
      if (existingRequest?.status === "PENDING") throw new ApiError(409, "You already have a pending join request");

      if (community.requireQuestions) {
        const questions = await db.communityJoinQuestion.findMany({
          where: { communityId },
          orderBy: { orderIndex: "asc" },
          select: { id: true, questionText: true, isRequired: true },
        });
        return { requiresApproval: true, requiresQuestions: true, questions };
      }

      await db.communityJoinRequest.upsert({
        where: { communityId_userId: { communityId, userId } },
        create: { communityId, userId, status: "PENDING" },
        update: { status: "PENDING", reviewedBy: null, reviewedAt: null },
      });

      return { requiresApproval: true, requestSubmitted: true };
    }

    await db.$transaction(async (tx) => {
      await tx.communityMember.create({
        data: { communityId, userId, role: "MEMBER", isApproved: true, lastSeenAt: new Date() },
      });
      await tx.community.update({
        where: { id: communityId },
        data: { memberCount: { increment: 1 }, lastActivityAt: new Date() },
      });
      await tx.communityActivityLog.create({
        data: { communityId, userId, action: "MEMBER_JOINED", targetType: "USER", targetId: userId },
      });
    });

    return { joined: true };
  },

  submitJoinRequest: async (userId, communityId, answers) => {
    const community = await db.community.findUnique({
      where: { id: communityId },
      select: { id: true, joinApproval: true, requireQuestions: true, isSuspended: true },
    });
    if (!community) throw new ApiError(404, "Community not found");
    if (community.isSuspended) throw new ApiError(400, "This community is currently suspended");

    const existing = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
    });
    if (existing) throw new ApiError(409, "You are already a member");

    await db.communityJoinRequest.upsert({
      where: { communityId_userId: { communityId, userId } },
      create: { communityId, userId, status: "PENDING", answers: answers || null },
      update: { status: "PENDING", answers: answers || null, reviewedBy: null, reviewedAt: null },
    });

    const requester = await db.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        profilePhoto: true,
      },
    });

    const admins = await db.communityMember.findMany({
      where: {
        communityId,
        role: {
          in: ["OWNER", "ADMIN", "MODERATOR"],
        },
      },
      select: {
        userId: true,
      },
    });

    const recipientIds = [
      ...new Set(admins.map((a) => a.userId)),
    ];

    if (recipientIds.length > 0) {
      await NotificationService.sendBulk({
        recipientIds,
        type: "COMMUNITY_JOIN_REQUEST",
        category: "COMMUNITY",
        priority: "MEDIUM",
        title: "New Join Request",
        message: `${requester?.firstName || "A user"} requested to join the community`,
        entityType: "Community",
        entityId: communityId,
        actionUrl: `/communities`,
        actorId: userId,
        actorName:
          `${requester?.firstName || ""} ${requester?.lastName || ""}`.trim(),
        actorAvatar:
          requester?.profilePicture || null,
      });
    }

    return { requestSubmitted: true };
  },

  leaveCommunity: async (userId, communityId) => {
    const member = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
      select: { id: true, role: true },
    });
    if (!member) throw new ApiError(404, "You are not a member of this community");
    if (member.role === "OWNER") throw new ApiError(400, "Owner cannot leave. Transfer ownership first.");

    await db.$transaction(async (tx) => {
      await tx.communityMember.delete({ where: { communityId_userId: { communityId, userId } } });
      await tx.community.update({
        where: { id: communityId },
        data: { memberCount: { decrement: 1 } },
      });
      await tx.communityActivityLog.create({
        data: { communityId, userId, action: "MEMBER_LEFT", targetType: "USER", targetId: userId },
      });
    });

    return { left: true };
  },

  approveJoinRequest: async (adminId, requestId) => {
    const request = await db.communityJoinRequest.findUnique({
      where: { id: requestId },
      select: { id: true, communityId: true, userId: true, status: true, answers: true },
    });
    if (!request) throw new ApiError(404, "Join request not found");
    if (request.status !== "PENDING") throw new ApiError(400, "This request has already been processed");
    console.log("admin id:",adminId)
    console.log("request.communityId:", request.communityId);


    const adminMember = await db.communityMember.findFirst({
      where: {
        communityId: request.communityId,
        userId: adminId,
      },
    });
    if (!adminMember || !["OWNER", "ADMIN", "MODERATOR"].includes(adminMember.role)) {
      throw new ApiError(403, "You don't have permission to approve join requests");
    }

    const community = await db.community.findUnique({
      where: { id: request.communityId },
      select: { maxMembers: true, memberCount: true, name:true, slug: true, logo:true },
    });
    if (community.maxMembers && community.memberCount >= community.maxMembers) {
      throw new ApiError(400, "Community has reached its member limit");
    }

    await db.$transaction(async (tx) => {
      await tx.communityJoinRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED", reviewedBy: adminId, reviewedAt: new Date() },
      });
      await tx.communityMember.create({
        data: {
          communityId: request.communityId,
          userId: request.userId,
          role: "MEMBER",
          isApproved: true,
          approvedBy: adminId,
          approvedAt: new Date(),
          joinAnswers: request.answers,
          lastSeenAt: new Date(),
        },
      });
      await tx.community.update({
        where: { id: request.communityId },
        data: { memberCount: { increment: 1 }, lastActivityAt: new Date() },
      });
      await tx.communityActivityLog.create({
        data: {
          communityId: request.communityId,
          userId: adminId,
          action: "JOIN_REQUEST_APPROVED",
          targetType: "USER",
          targetId: request.userId,
        },
      });
    });

    const approver = await db.user.findUnique({
      where: {
        id: adminId,
      },
      select: {
        firstName: true,
        lastName: true,
        profilePhoto: true,
      },
    });

    await NotificationService.send({
      recipientId: request.userId,
      type: "COMMUNITY_JOIN_APPROVED",
      category: "COMMUNITY",
      priority: "HIGH",
      title: "Join Request Approved",
      message: `Your request to join ${community?.name || "the community"} has been approved.`,
      entityType: "Community",
      entityId: request.communityId,
      actionUrl: `/community/${community.slug}`,
      actorId: adminId,
      actorName:
        `${approver?.firstName || ""} ${approver?.lastName || ""}`.trim(),
      actorAvatar: community.logo
    });
    return { approved: true };
  },

  rejectJoinRequest: async (adminId, requestId) => {
    const request = await db.communityJoinRequest.findUnique({
      where: { id: requestId },
      select: { id: true, communityId: true, userId: true, status: true },
    });
    if (!request) throw new ApiError(404, "Join request not found");
    if (request.status !== "PENDING") throw new ApiError(400, "This request has already been processed");

    const adminMember = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: request.communityId, userId: adminId } },
      select: { role: true },
    });
    if (!adminMember || !["OWNER", "ADMIN", "MODERATOR"].includes(adminMember.role)) {
      throw new ApiError(403, "You don't have permission to reject join requests");
    }

    await db.communityJoinRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", reviewedBy: adminId, reviewedAt: new Date() },
    });

    return { rejected: true };
  },

  getPendingRequests: async (adminId, communityId, query) => {
    const adminMember = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: adminId } },
      select: { role: true },
    });
    if (!adminMember || !["OWNER", "ADMIN", "MODERATOR"].includes(adminMember.role)) {
      throw new ApiError(403, "You don't have permission to view join requests");
    }

    const { skip, take } = buildQueryOptions({ page: query.page, limit: query.limit });

    const [requests, total] = await Promise.all([
      db.communityJoinRequest.findMany({
        where: { communityId, status: "PENDING" },
        orderBy: { createdAt: "asc" },
        skip,
        take,
        select: {
          id: true,
          status: true,
          answers: true,
          createdAt: true,
          user: memberUserSelect,
        },
      }),
      db.communityJoinRequest.count({ where: { communityId, status: "PENDING" } }),
    ]);

    return { requests, total, page: query.page || 1, limit: query.limit || 10 };
  },

  inviteMember: async (inviterId, communityId, data) => {
    if(!communityId) throw new ApiError(400, "Community id is required");
    const community = await db.community.findUnique({
      where: { id: communityId },
      select: { id: true, name: true, slug : true, isSuspended: true, category:true, memberCount:true },
    });
    if (!community) throw new ApiError(404, "Community not found");
    if (community.isSuspended) throw new ApiError(400, "This community is currently suspended");

    const inviterMember = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: inviterId } },
      select: { role: true, isBanned: true },
    });
    if (!inviterMember) throw new ApiError(403, "You are not a member of this community");
    if (inviterMember.isBanned) throw new ApiError(403, "You are banned from this community");

    if (data.userId) {
      const user = await db.user.findUnique({
        where: {
          id: data.userId,
        },
        select: {
          id: true,
        },
      });
      if (!user) {
        throw new ApiError(404, "No user found with the provided userId.");
      }
    }
    
    if (data.email) {
      const user = await db.user.findUnique({
        where: {
          email: data.email,
        },
        select: {
          id: true,
        },
      });
      if (!user) {
        throw new ApiError(404, "No user found with the provided email.");
      }
    }

    let inviteeUserId = data.userId || null;
    if (data.email && !inviteeUserId) {
      const user = await db.user.findUnique({ where: { email: data.email }, select: { id: true } });
      if (user) inviteeUserId = user.id;
    }

    if (inviteeUserId) {
      const existingMember = await db.communityMember.findUnique({
        where: { communityId_userId: { communityId, userId: inviteeUserId } },
      });
      if (existingMember) throw new ApiError(409, "User is already a member of this community");
    }

    const code = uuidv4().replace(/-/g, "").substring(0, 16);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await db.communityInvite.create({
      data: {
        communityId,
        inviterId,
        inviteeUserId,
        inviteeEmail: data.email || null,
        code,
        message: data.message || null,
        expiresAt,
      },
      select: {
        id: true,
        code: true,
        inviteeEmail: true,
        inviteeUserId: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    const inviter = await db.user.findUnique({
      where: { id: inviterId },
      select: {
        firstName: true,
        lastName: true,
        profilePhoto: true,
      },
    });

    if (inviteeUserId) {
      await NotificationService.send({
        recipientId: inviteeUserId,
        type: "COMMUNITY_INVITE",
        category: "COMMUNITY",
        priority: "MEDIUM",
        title: "Community Invitation",
        message: `You have been invited to join ${community.name} community`,
        entityType: "Community",
        entityId: communityId,
        actionUrl: `/community/${community.slug}`,
        actorId: inviterId,
        actorName:
          `${inviter?.firstName || ""} ${inviter?.lastName || ""}`.trim(),
        actorAvatar:
          inviter?.profilePhoto || null,
        data: {
          inviterName: `${inviter?.firstName || ""} ${inviter?.lastName || ""}`.trim(),
          communityName: community.name,
          category: community.category,
          memberCount: community.memberCount,
          description: community.description,
          message: data.message || null,  
        },
      });
    }

    return invite;
  },

  generateInviteLink: async (userId, communityId) => {
    const member = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
      select: { role: true, isBanned: true },
    });
    if (!member) throw new ApiError(403, "You are not a member of this community");
    if (member.isBanned) throw new ApiError(403, "You are banned from this community");

    const code = uuidv4().replace(/-/g, "").substring(0, 16);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const invite = await db.communityInvite.create({
      data: { communityId, inviterId: userId, code, expiresAt },
      select: { code: true, expiresAt: true },
    });

    return { code: invite.code, expiresAt: invite.expiresAt };
  },

  validateInviteCode: async (code) => {
    const invite = await db.communityInvite.findUnique({
      where: {
        code,
      },
      select: {
        id: true,
        code: true,
        status: true,
        expiresAt: true,
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            about: true,
            logo: true,
            coverImage: true,
            bannerColor: true,
            category: true,
            visibility: true,
            tags: true,
            website: true,
            location: true,
            industry: true,
            isVerified: true,
            memberCount: true,
            postCount: true,
            weeklyActiveMembers: true,
            isSuspended: true,
            createdAt: true,
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                profilePhoto: true,
              },
            },
            _count: {
              select: {
                members: true,
                posts: true,
              },
            },
          },
        },
        inviter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            profilePhoto: true,
          },
        },
      },
    });
  
    const isValid =
      !!invite &&
      invite.status === "PENDING" &&
      (!invite.expiresAt || invite.expiresAt > new Date()) &&
      !invite.community.isSuspended;
    console.log("invite:",invite);
  
    return {
      isValid,
      invite: isValid
        ? {
          id: invite.id,
          code: invite.code,
          status: invite.status,
          expiresAt: invite.expiresAt,
          inviter: invite.inviter,
          community: {
            ...invite.community,
            analytics: {
              members: invite.community._count.members,
              posts: invite.community._count.posts,
            },
          },
          }
        : null,
    };
  },

  acceptInvite: async (userId, code) => {
    const invite = await db.communityInvite.findUnique({
      where: { code },
      select: { id: true, communityId: true, status: true, expiresAt: true, inviterId: true },
    });
    if (!invite) throw new ApiError(404, "Invite not found or invalid");
    if (invite.status !== "PENDING") throw new ApiError(400, "This invite has already been used");
    if (invite.expiresAt && invite.expiresAt < new Date()) throw new ApiError(400, "This invite has expired");

    const community = await db.community.findUnique({
      where: { id: invite.communityId },
      select: { id: true, maxMembers: true, memberCount: true, isSuspended: true },
    });
    if (!community) throw new ApiError(404, "Community no longer exists");
    if (community.isSuspended) throw new ApiError(400, "This community is currently suspended");
    if (community.maxMembers && community.memberCount >= community.maxMembers) {
      throw new ApiError(400, "Community has reached its member limit");
    }

    const existing = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: invite.communityId, userId } },
    });
    if (existing) {
      if (existing.isBanned) throw new ApiError(403, "You are banned from this community");
      throw new ApiError(409, "You are already a member of this community");
    }

    await db.$transaction(async (tx) => {
      await tx.communityInvite.update({ where: { id: invite.id }, data: { status: "ACCEPTED", inviteeUserId: userId } });
      await tx.communityMember.create({
        data: {
          communityId: invite.communityId,
          userId,
          role: "MEMBER",
          isApproved: true,
          invitedBy: invite.inviterId,
          lastSeenAt: new Date(),
        },
      });
      await tx.community.update({
        where: { id: invite.communityId },
        data: { memberCount: { increment: 1 }, lastActivityAt: new Date() },
      });
      await tx.communityActivityLog.create({
        data: {
          communityId: invite.communityId,
          userId,
          action: "MEMBER_JOINED_VIA_INVITE",
          targetType: "INVITE",
          targetId: invite.id,
        },
      });
    });

    return { joined: true, communityId: invite.communityId };
  },

  declineInvite: async (userId, inviteId) => {
    const invite = await db.communityInvite.findUnique({
      where: { id: inviteId },
      select: { id: true, inviteeUserId: true, status: true },
    });
    if (!invite) throw new ApiError(404, "Invite not found");
    if (invite.inviteeUserId && invite.inviteeUserId !== userId) throw new ApiError(403, "This invite is not for you");
    if (invite.status !== "PENDING") throw new ApiError(400, "This invite has already been processed");

    await db.communityInvite.update({ where: { id: inviteId }, data: { status: "DECLINED" } });
    return { declined: true };
  },

  getMembers: async (communityId, query) => {
    const { skip, take } = buildQueryOptions({ page: query.page, limit: query.limit });

    const where = { communityId, isBanned: false };
    if (query.role) where.role = query.role;
    if (query.search) {
      where.user = {
        OR: [
          { firstName: { contains: query.search, mode: "insensitive" } },
          { lastName: { contains: query.search, mode: "insensitive" } },
          { username: { contains: query.search, mode: "insensitive" } },
        ],
      };
    }

    const [members, total] = await Promise.all([
      db.communityMember.findMany({
        where,
        orderBy: query.sortBy === "contribution" ? { contributionScore: "desc" } : { joinedAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          role: true,
          joinedAt: true,
          contributionScore: true,
          lastSeenAt: true,
          user: memberUserSelect,
        },
      }),
      db.communityMember.count({ where }),
    ]);

    return { members, total, page: query.page || 1, limit: query.limit || 10 };
  },

  changeMemberRole: async (adminId, memberId, newRole) => {
    const member = await db.communityMember.findUnique({
      where: { id: memberId },
      select: { id: true, communityId: true, userId: true, role: true },
    });
    if (!member) throw new ApiError(404, "Member not found");

    const adminMember = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: member.communityId, userId: adminId } },
      select: { role: true },
    });
    if (!adminMember) throw new ApiError(403, "You are not a member of this community");

    const roleHierarchy = { OWNER: 4, ADMIN: 3, MODERATOR: 2, MEMBER: 1 };

    if (roleHierarchy[adminMember.role] <= roleHierarchy[member.role]) {
      throw new ApiError(403, "You cannot change the role of someone at or above your level");
    }
    if (roleHierarchy[newRole] >= roleHierarchy[adminMember.role]) {
      throw new ApiError(403, "You cannot assign a role at or above your own level");
    }
    if (newRole === "OWNER") throw new ApiError(400, "Use the transfer ownership endpoint instead");

    await db.communityMember.update({ where: { id: memberId }, data: { role: newRole } });

    await db.communityActivityLog.create({
      data: {
        communityId: member.communityId,
        userId: adminId,
        action: "ROLE_CHANGED",
        targetType: "USER",
        targetId: member.userId,
        metadata: { from: member.role, to: newRole },
      },
    });

    return { updated: true, newRole };
  },

  banMember: async (adminId, memberId, reason, duration) => {
    const member = await db.communityMember.findUnique({
      where: { id: memberId },
      select: { id: true, communityId: true, userId: true, role: true },
    });
    if (!member) throw new ApiError(404, "Member not found");

    const adminMember = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: member.communityId, userId: adminId } },
      select: { role: true },
    });
    if (!adminMember || !["OWNER", "ADMIN", "MODERATOR"].includes(adminMember.role)) {
      throw new ApiError(403, "You don't have permission to ban members");
    }

    const roleHierarchy = { OWNER: 4, ADMIN: 3, MODERATOR: 2, MEMBER: 1 };
    if (roleHierarchy[adminMember.role] <= roleHierarchy[member.role]) {
      throw new ApiError(403, "You cannot ban someone at or above your level");
    }

    const expiresAt = duration ? new Date(Date.now() + duration * 60 * 60 * 1000) : null;

    await db.$transaction(async (tx) => {
      await tx.communityMember.update({
        where: { id: memberId },
        data: { isBanned: true, bannedAt: new Date(), bannedReason: reason, bannedBy: adminId },
      });
      await tx.community.update({
        where: { id: member.communityId },
        data: { memberCount: { decrement: 1 } },
      });
      await tx.communityBanLog.create({
        data: {
          communityId: member.communityId,
          userId: member.userId,
          action: "BAN",
          reason,
          performedById: adminId,
          duration: duration || null,
          expiresAt,
        },
      });
      await tx.communityActivityLog.create({
        data: {
          communityId: member.communityId,
          userId: adminId,
          action: "MEMBER_BANNED",
          targetType: "USER",
          targetId: member.userId,
          metadata: { reason, duration },
        },
      });
    });

    return { banned: true };
  },

  unbanMember: async (adminId, memberId) => {
    const member = await db.communityMember.findUnique({
      where: { id: memberId },
      select: { id: true, communityId: true, userId: true, isBanned: true },
    });
    if (!member) throw new ApiError(404, "Member not found");
    if (!member.isBanned) throw new ApiError(400, "This member is not banned");

    const adminMember = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: member.communityId, userId: adminId } },
      select: { role: true },
    });
    if (!adminMember || !["OWNER", "ADMIN", "MODERATOR"].includes(adminMember.role)) {
      throw new ApiError(403, "You don't have permission to unban members");
    }

    await db.$transaction(async (tx) => {
      await tx.communityMember.update({
        where: { id: memberId },
        data: { isBanned: false, bannedAt: null, bannedReason: null, bannedBy: null },
      });
      await tx.community.update({
        where: { id: member.communityId },
        data: { memberCount: { increment: 1 } },
      });
      await tx.communityBanLog.create({
        data: {
          communityId: member.communityId,
          userId: member.userId,
          action: "UNBAN",
          performedById: adminId,
        },
      });
    });

    return { unbanned: true };
  },

  muteMember: async (adminId, memberId, reason, durationHours) => {
    const member = await db.communityMember.findUnique({
      where: { id: memberId },
      select: { id: true, communityId: true, userId: true, role: true },
    });
    if (!member) throw new ApiError(404, "Member not found");

    const adminMember = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: member.communityId, userId: adminId } },
      select: { role: true },
    });
    if (!adminMember || !["OWNER", "ADMIN", "MODERATOR"].includes(adminMember.role)) {
      throw new ApiError(403, "You don't have permission to mute members");
    }

    const mutedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);

    await db.$transaction(async (tx) => {
      await tx.communityMember.update({ where: { id: memberId }, data: { mutedUntil } });
      await tx.communityBanLog.create({
        data: {
          communityId: member.communityId,
          userId: member.userId,
          action: "MUTE",
          reason: reason || null,
          performedById: adminId,
          duration: durationHours,
          expiresAt: mutedUntil,
        },
      });
    });

    return { muted: true, mutedUntil };
  },

  unmuteMember: async (adminId, memberId) => {
    const member = await db.communityMember.findUnique({
      where: { id: memberId },
      select: { id: true, communityId: true, userId: true, mutedUntil: true },
    });
    if (!member) throw new ApiError(404, "Member not found");
    if (!member.mutedUntil) throw new ApiError(400, "This member is not muted");

    const adminMember = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: member.communityId, userId: adminId } },
      select: { role: true },
    });
    if (!adminMember || !["OWNER", "ADMIN", "MODERATOR"].includes(adminMember.role)) {
      throw new ApiError(403, "You don't have permission to unmute members");
    }

    await db.$transaction(async (tx) => {
      await tx.communityMember.update({ where: { id: memberId }, data: { mutedUntil: null } });
      await tx.communityBanLog.create({
        data: {
          communityId: member.communityId,
          userId: member.userId,
          action: "UNMUTE",
          performedById: adminId,
        },
      });
    });

    return { unmuted: true };
  },

  warnMember: async (adminId, memberId, reason) => {
    const member = await db.communityMember.findUnique({
      where: { id: memberId },
      select: { id: true, communityId: true, userId: true },
    });
    if (!member) throw new ApiError(404, "Member not found");

    const adminMember = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: member.communityId, userId: adminId } },
      select: { role: true },
    });
    if (!adminMember || !["OWNER", "ADMIN", "MODERATOR"].includes(adminMember.role)) {
      throw new ApiError(403, "You don't have permission to warn members");
    }

    await db.communityBanLog.create({
      data: {
        communityId: member.communityId,
        userId: member.userId,
        action: "WARN",
        reason,
        performedById: adminId,
      },
    });

    return { warned: true };
  },

  getBanLog: async (adminId, communityId, query) => {
    const adminMember = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId: adminId } },
      select: { role: true },
    });
    if (!adminMember || !["OWNER", "ADMIN", "MODERATOR"].includes(adminMember.role)) {
      throw new ApiError(403, "You don't have permission to view the ban log");
    }

    const { skip, take } = buildQueryOptions({ page: query.page, limit: query.limit });

    const [logs, total] = await Promise.all([
      db.communityBanLog.findMany({
        where: { communityId },
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          action: true,
          reason: true,
          duration: true,
          expiresAt: true,
          createdAt: true,
          user: memberUserSelect,
          performedBy: memberUserSelect,
        },
      }),
      db.communityBanLog.count({ where: { communityId } }),
    ]);

    return { logs, total, page: query.page || 1, limit: query.limit || 10 };
  },

  updateNotificationPreference: async (userId, communityId, preference) => {
    const member = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
      select: { id: true },
    });
    if (!member) throw new ApiError(404, "You are not a member of this community");

    await db.communityMember.update({
      where: { communityId_userId: { communityId, userId } },
      data: { notificationPreference: preference },
    });

    return { updated: true, preference };
  },

  addJoinQuestion: async (userId, communityId, data) => {
    const adminMember = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
      select: { role: true },
    });
    if (!adminMember || !["OWNER", "ADMIN"].includes(adminMember.role)) {
      throw new ApiError(403, "You don't have permission to manage join questions");
    }

    const maxOrder = await db.communityJoinQuestion.aggregate({
      where: { communityId },
      _max: { orderIndex: true },
    });

    return db.communityJoinQuestion.create({
      data: {
        communityId,
        questionText: data.questionText,
        isRequired: data.isRequired ?? true,
        orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
      },
      select: { id: true, questionText: true, isRequired: true, orderIndex: true },
    });
  },

  getJoinQuestions: async (userId, communityId) => {
    const adminMember = await db.communityMember.findUnique({
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
  
    if (!adminMember || !["OWNER", "ADMIN"].includes(adminMember.role)) {
      throw new ApiError(
        403,
        "You don't have permission to view join questions"
      );
    }
  
    const questions = await db.communityJoinQuestion.findMany({
      where: {
        communityId,
      },
      orderBy: {
        orderIndex: "asc",
      },
      select: {
        id: true,
        questionText: true,
        isRequired: true,
        orderIndex: true,
        createdAt: true,
      },
    });
  
    return questions;
  },

  updateJoinQuestion: async (userId, questionId, data) => {
    const question = await db.communityJoinQuestion.findUnique({
      where: { id: questionId },
      select: { id: true, communityId: true },
    });
    if (!question) throw new ApiError(404, "Question not found");

    const adminMember = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: question.communityId, userId } },
      select: { role: true },
    });
    if (!adminMember || !["OWNER", "ADMIN"].includes(adminMember.role)) {
      throw new ApiError(403, "You don't have permission to manage join questions");
    }

    const updateData = {};
    if (data.questionText !== undefined) updateData.questionText = data.questionText;
    if (data.isRequired !== undefined) updateData.isRequired = data.isRequired;

    return db.communityJoinQuestion.update({
      where: { id: questionId },
      data: updateData,
      select: { id: true, questionText: true, isRequired: true, orderIndex: true },
    });
  },

  deleteJoinQuestion: async (userId, questionId) => {
    const question = await db.communityJoinQuestion.findUnique({
      where: { id: questionId },
      select: { id: true, communityId: true },
    });
    if (!question) throw new ApiError(404, "Question not found");

    const adminMember = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: question.communityId, userId } },
      select: { role: true },
    });
    if (!adminMember || !["OWNER", "ADMIN"].includes(adminMember.role)) {
      throw new ApiError(403, "You don't have permission to manage join questions");
    }

    await db.communityJoinQuestion.delete({ where: { id: questionId } });
    return { deleted: true };
  },

  reorderJoinQuestions: async (userId, communityId, orderedIds) => {
    const adminMember = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
      select: { role: true },
    });
    if (!adminMember || !["OWNER", "ADMIN"].includes(adminMember.role)) {
      throw new ApiError(403, "You don't have permission to manage join questions");
    }

    await db.$transaction(
      orderedIds.map((id, index) =>
        db.communityJoinQuestion.update({ where: { id }, data: { orderIndex: index } })
      )
    );

    return { reordered: true };
  },
};
