import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { recordEntityVisit } from "../../../utils/helperFunctions.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";
import { NotificationService } from "../../common/notification.service.js";
import { emitConnectionEvent } from "./connection-events.js";

export const UserSocialService = {
  getProfile: async ({ username, viewerId, ipAddress, userAgent }) => {
    if (!username) {
      throw new ApiError(400, "username is required");
    }
 
    const user = await db.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        headline: true,
        bio: true,
        profilePhoto: true,
        coverImage: true,
        location: true,
        socialLinks: true,
        skills: true,
        experiences: true,
        educations: true,
        certifications: true,
        createdAt: true,
        roles: true,
        mentorProfile: {
          select: {
            id: true,
          },
        },
        roleProfiles: true,
        _count: {
          select: {
            followers: true,
            following: true,
            posts: true,
          },
        },
      },
    });
 
    console.log("THIS IS USER", user);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
 
    let relationshipStatus = {
      isFollowing: false,
      isFollower: false,
      connectionStatus: null,
    };
 
    if (viewerId && viewerId !== user.id) {
      const followingCheck = await db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: user.id,
          },
        },
      });
 
      const followerCheck = await db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: user.id,
            followingId: viewerId,
          },
        },
      });
 
      const connection = await db.connection.findFirst({
        where: {
          OR: [
            { senderId: viewerId, receiverId: user.id },
            { senderId: user.id, receiverId: viewerId },
          ],
        },
        select: {
          id: true,
          status: true,
          senderId: true,
        },
      });

      relationshipStatus = {
        isFollowing: !!followingCheck,
        isFollower: !!followerCheck,
        connectionStatus: connection
          ? {
              connectionId: connection.id,
              status: connection.status,
              isSender: connection.senderId === viewerId,
            }
          : null,
      };
       
      await recordEntityVisit({
        entityType: "USER_PROFILE",
        entityId: user.id,
        viewerId,
        ipAddress,
        userAgent,
      });
    } else if (!viewerId) {
      await recordEntityVisit({
        entityType: "USER_PROFILE",
        entityId: user.id,
        viewerId: null,
        ipAddress,
        userAgent,
      });
    }

    return {
      ...user,
      stats: {
        followersCount: user._count.followers,
        followingCount: user._count.following,
        postsCount: user._count.posts,
      },
      relationshipStatus,
    };
  },

  /* FOLLOW */
  followUser: async ({ followerId, followingId }) => {
    if (followerId === followingId) {
      throw new ApiError(400, "You cannot follow yourself");
    }

    const targetUser = await db.user.findUnique({
      where: { id: followingId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new ApiError(404, "User not found");
    }

    const existingFollow = await db.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });

    if (existingFollow) {
      throw new ApiError(409, "Already following this user");
    }

    return db.follow.create({
      data: { followerId, followingId },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
        follower: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username:true,
            profilePhoto: true,
          },
        },
      },
    }).then((follow) => {
      const actorFullName = `${follow.follower.firstName} ${follow.follower.lastName}`.trim() || "Someone";
      NotificationService.sendGrouped({
        recipientId: followingId,
        type: "FOLLOW",
        category: "SOCIAL",
        title: "New follower",
        message: `started following you`,
        actionUrl: `/profile/${follow.follower.username}`,
        actorId: followerId,
        actorName: actorFullName,
        actorAvatar: follow.follower.profilePhoto || null,
        entityType: "User",
        entityId: followingId,
        groupKey: `user:${followingId}:follow`,
      }).catch(() => {});
      return follow;
    });
  },

  unfollowUser: async ({ followerId, followingId }) => {
    if (followerId === followingId) {
      throw new ApiError(400, "Invalid operation");
    }

    const existingFollow = await db.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });

    if (!existingFollow) {
      throw new ApiError(404, "Follow relationship not found");
    }

    await db.follow.delete({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });
  },

  /* CONNECTIONS */
  sendConnectionRequest: async ({ senderId, receiverId, message }) => {
    if (senderId === receiverId) {
      throw new ApiError(400, "Cannot connect with yourself");
    }

    const receiver = await db.user.findUnique({
      where: { id: receiverId },
      select: { id: true, username: true },
    });

    if (!receiver) {
      throw new ApiError(404, "User not found");
    }

    const existing = await db.connection.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
    });

    if (existing) {
      if (existing.status === "PENDING") {
        throw new ApiError(409, "Connection request already pending");
      }
      if (existing.status === "ACCEPTED") {
        throw new ApiError(409, "Already connected");
      }
      if (existing.status === "REJECTED") {
        const cooldownMs = 7 * 24 * 60 * 60 * 1000;
        const rejectedAt = new Date(existing.updatedAt).getTime();
        const canRetryAt = rejectedAt + cooldownMs;

        if (Date.now() < canRetryAt) {
          const retryDate = new Date(canRetryAt).toISOString().split("T")[0];
          throw new ApiError(
            409,
            `You can send a new request after ${retryDate}`,
          );
        }

        await db.connection.delete({ where: { id: existing.id } });
      }
    }

    return db.connection.create({
      data: {
        senderId,
        receiverId,
        message,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
      },
    }).then((conn) => {
      const senderName = `${conn.sender.firstName} ${conn.sender.lastName}`.trim() || "Someone";
      NotificationService.send({
        recipientId: receiverId,
        type: "CONNECTION_REQUEST",
        category: "SOCIAL",
        title: "New connection request",
        message: "wants to connect with you",
        data: { connectionId: conn.id, connectionMessage: message || null, actorSlug: conn.sender.username },
        actionUrl: `/profile/${conn.sender.username}`,
        actorId: senderId,
        actorName: senderName,
        actorAvatar: conn.sender.profilePhoto || null,
        entityType: "Connection",
        entityId: conn.id,
      }).catch(() => {});

      emitConnectionEvent(receiverId, "connection:request-received", {
        connectionId: conn.id,
        sender: conn.sender,
        message: message || null,
      });

      return conn;
    });
  },

  acceptConnection: async ({ connectionId, userId }) => {
    const connection = await db.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new ApiError(404, "Connection request not found");
    }

    if (connection.receiverId !== userId) {
      throw new ApiError(403, "Unauthorized action");
    }

    if (connection.status !== "PENDING") {
      throw new ApiError(400, "Connection request already processed");
    }

    return db.connection.update({
      where: { id: connectionId },
      data: {
        status: "ACCEPTED",
        respondedAt: new Date(),
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username:true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
      },
    }).then((updated) => {
      const receiverName = `${updated.receiver.firstName} ${updated.receiver.lastName}`.trim() || "Someone";
      NotificationService.send({
        recipientId: connection.senderId,
        type: "CONNECTION_ACCEPTED",
        category: "SOCIAL",
        title: "Connection accepted",
        message: `accepted your connection request`,
        data: { connectionId, actorSlug: updated.sender.username },
        actionUrl: `/profile/${updated.receiver.username}`,
        actorId: userId,
        actorName: receiverName,
        actorAvatar: updated.receiver.profilePhoto || null,
        entityType: "Connection",
        entityId: connectionId,
      }).catch(() => {});

      emitConnectionEvent(connection.senderId, "connection:accepted", {
        connectionId,
        acceptedBy: updated.receiver,
      });

      emitConnectionEvent(userId, "connection:accepted", {
        connectionId,
        connectedWith: updated.sender,
      });

      return updated;
    });
  },

  rejectConnection: async ({ connectionId, userId }) => {
    const connection = await db.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new ApiError(404, "Connection request not found");
    }

    if (connection.receiverId !== userId) {
      throw new ApiError(403, "Unauthorized action");
    }

    if (connection.status !== "PENDING") {
      throw new ApiError(400, "Connection request already processed");
    }

    const updated = await db.connection.update({
      where: { id: connectionId },
      data: {
        status: "REJECTED",
        respondedAt: new Date(),
      },
    });

    emitConnectionEvent(connection.senderId, "connection:rejected", {
      connectionId,
      rejectedBy: userId,
    });

    return updated;
  },

  /* VIEWS  */
  getFollowers: async (userId, viewerId, queryParams) => {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const { skip, take, where, orderBy } = buildQueryOptions({
      ...queryParams,
      searchFields: [
        "follower.firstName",
        "follower.lastName",
        "follower.username",
      ],
      defaultFields: [
        "follower.firstName",
        "follower.lastName",
        "follower.username",
      ],
      sortBy: queryParams.sortBy || "createdAt",
      order: queryParams.order || "desc",
    });

    const mainWhere = {
      followingId: userId,
      ...(where.OR && {
        follower: {
          OR: where.OR.map((condition) => condition.follower || condition),
        },
      }),
    };

    const totalCount = await db.follow.count({
      where: mainWhere,
    });

    const followers = await db.follow.findMany({
      where: mainWhere,
      skip,
      take,
      include: {
        follower: {
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
      orderBy,
    });

    let followersWithContext = followers;
    if (viewerId) {
      followersWithContext = await Promise.all(
        followers.map(async (follow) => {
          const isFollowing = await db.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId: viewerId,
                followingId: follow.follower.id,
              },
            },
          });

          return {
            ...follow,
            viewerIsFollowing: !!isFollowing,
          };
        }),
      );
    }

    return {
      data: followersWithContext,
      pagination: {
        total: totalCount,
        page: Number(queryParams.page) || 1,
        limit: Number(queryParams.limit) || 10,
        totalPages: Math.ceil(totalCount / (Number(queryParams.limit) || 10)),
      },
    };
  },

  getFollowing: async (userId, viewerId, queryParams) => {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const { skip, take, where, orderBy } = buildQueryOptions({
      ...queryParams,
      searchFields: [
        "following.firstName",
        "following.lastName",
        "following.username",
      ],
      defaultFields: [
        "following.firstName",
        "following.lastName",
        "following.username",
      ],
      sortBy: queryParams.sortBy || "createdAt",
      order: queryParams.order || "desc",
    });

    const mainWhere = {
      followerId: userId,
      ...(where.OR && {
        following: {
          OR: where.OR.map((condition) => condition.following || condition),
        },
      }),
    };

    const totalCount = await db.follow.count({
      where: mainWhere,
    });

    const following = await db.follow.findMany({
      where: mainWhere,
      skip,
      take,
      include: {
        following: {
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
      orderBy,
    });

    let followingWithContext = following;
    if (viewerId) {
      followingWithContext = await Promise.all(
        following.map(async (follow) => {
          const isFollowing = await db.follow.findUnique({
            where: {
              followerId_followingId: {
                followerId: viewerId,
                followingId: follow.following.id,
              },
            },
          });

          return {
            ...follow,
            viewerIsFollowing: !!isFollowing,
          };
        }),
      );
    }

    return {
      data: followingWithContext,
      pagination: {
        total: totalCount,
        page: Number(queryParams.page) || 1,
        limit: Number(queryParams.limit) || 10,
        totalPages: Math.ceil(totalCount / (Number(queryParams.limit) || 10)),
      },
    };
  },

  getConnections: async (userId, queryParams) => {
    const { skip, take, where, orderBy } = buildQueryOptions({
      ...queryParams,
      searchFields: [
        "sender.firstName",
        "sender.lastName",
        "sender.username",
        "receiver.firstName",
        "receiver.lastName",
        "receiver.username",
      ],
      defaultFields: [
        "sender.firstName",
        "sender.lastName",
        "sender.username",
        "receiver.firstName",
        "receiver.lastName",
        "receiver.username",
      ],
      sortBy: queryParams.sortBy || "respondedAt",
      order: queryParams.order || "desc",
    });

    const mainWhere = {
      status: "ACCEPTED",
      OR: [{ senderId: userId }, { receiverId: userId }],
      ...(where.OR && {
        AND: [
          {
            OR: [
              { sender: { OR: where.OR.map((c) => c.sender || c) } },
              { receiver: { OR: where.OR.map((c) => c.receiver || c) } },
            ],
          },
        ],
      }),
    };

    const totalCount = await db.connection.count({
      where: mainWhere,
    });

    const connections = await db.connection.findMany({
      where: mainWhere,
      skip,
      take,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            headline: true,
          },
        },
        receiver: {
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
      orderBy,
    });

    const formattedConnections = connections.map((connection) => {
      const connectedUser =
        connection.senderId === userId
          ? connection.receiver
          : connection.sender;
    
      return {
        id: connectedUser.id,
        firstName: connectedUser.firstName,
        lastName: connectedUser.lastName,
        username: connectedUser.username,
        profilePhoto: connectedUser.profilePhoto,
        headline: connectedUser.headline,
        connectedAt: connection.respondedAt,
        connectionId: connection.id,
      };
    });

    return {
      data: connections,
      connectedUsers: formattedConnections,
      pagination: {
        total: totalCount,
        page: Number(queryParams.page) || 1,
        limit: Number(queryParams.limit) || 10,
        totalPages: Math.ceil(totalCount / (Number(queryParams.limit) || 10)),
      },
    };
  },
  getReceivedConnectionRequests: async (userId, queryParams) => {
    const { skip, take, where, orderBy } = buildQueryOptions({
      ...queryParams,
      searchFields: ["sender.firstName", "sender.lastName", "sender.username"],
      defaultFields: ["sender.firstName", "sender.lastName", "sender.username"],
      sortBy: queryParams.sortBy || "createdAt",
      order: queryParams.order || "desc",
    });

    const mainWhere = {
      receiverId: userId,
      status: "PENDING",
      ...(where.OR && {
        sender: { OR: where.OR.map((c) => c.sender || c) },
      }),
    };

    const totalCount = await db.connection.count({ where: mainWhere });

    const requests = await db.connection.findMany({
      where: mainWhere,
      skip,
      take,
      include: {
        sender: {
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
      orderBy,
    });

    return {
      data: requests,
      pagination: {
        total: totalCount,
        page: Number(queryParams.page) || 1,
        limit: Number(queryParams.limit) || 10,
        totalPages: Math.ceil(totalCount / (Number(queryParams.limit) || 10)),
      },
    };
  },

  getSentConnectionRequests: async (userId, queryParams) => {
    const { skip, take, where, orderBy } = buildQueryOptions({
      ...queryParams,
      searchFields: [
        "receiver.firstName",
        "receiver.lastName",
        "receiver.username",
      ],
      defaultFields: [
        "receiver.firstName",
        "receiver.lastName",
        "receiver.username",
      ],
      sortBy: queryParams.sortBy || "createdAt",
      order: queryParams.order || "desc",
    });

    const mainWhere = {
      senderId: userId,
      status: "PENDING",
      ...(where.OR && {
        receiver: { OR: where.OR.map((c) => c.receiver || c) },
      }),
    };

    const totalCount = await db.connection.count({ where: mainWhere });

    const requests = await db.connection.findMany({
      where: mainWhere,
      skip,
      take,
      include: {
        receiver: {
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
      orderBy,
    });

    return {
      data: requests,
      pagination: {
        total: totalCount,
        page: Number(queryParams.page) || 1,
        limit: Number(queryParams.limit) || 10,
        totalPages: Math.ceil(totalCount / (Number(queryParams.limit) || 10)),
      },
    };
  },

  withdrawConnectionRequest: async ({ connectionId, userId }) => {
    const connection = await db.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new ApiError(404, "Connection request not found");
    }

    if (connection.senderId !== userId) {
      throw new ApiError(403, "You can only withdraw your own requests");
    }

    if (connection.status !== "PENDING") {
      throw new ApiError(400, "Only pending requests can be withdrawn");
    }

    await db.connection.delete({
      where: { id: connectionId },
    });

    emitConnectionEvent(connection.receiverId, "connection:withdrawn", {
      connectionId,
      withdrawnBy: userId,
    });
  },

  removeConnection: async ({ connectionId, userId }) => {
    const connection = await db.connection.findUnique({
      where: { id: connectionId },
    });
    if (!connection) {
      throw new ApiError(404, "Connection not found");
    }
    const isParticipant =
      connection.senderId === userId ||
      connection.receiverId === userId;
  
    if (!isParticipant) {
      throw new ApiError(
        403,
        "You are not allowed to remove this connection"
      );
    }
  
    await db.connection.delete({
      where: { id: connectionId },
    });
  
    const otherUserId = connection.senderId === userId
        ? connection.receiverId
        : connection.senderId;
  
    emitConnectionEvent(
      otherUserId,
      "connection:removed",
      {
        connectionId,
        removedBy: userId,
      }
    );
  
    return {
      success: true,
    };
  },

  blockUser: async ({ blockerId, blockedId, reason }) => {
    if (blockerId === blockedId) {
      throw new ApiError(400, "You cannot block yourself");
    }

    const userExists = await db.user.findUnique({
      where: { id: blockedId },
      select: { id: true },
    });

    if (!userExists) {
      throw new ApiError(404, "User not found");
    }

    const existingBlock = await db.userBlock.findUnique({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
    });

    if (existingBlock) {
      throw new ApiError(409, "User is already blocked");
    }

    const block = await db.userBlock.create({
      data: { blockerId, blockedId, reason },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
      },
    });

    await Promise.all([
      db.connection.deleteMany({
        where: {
          OR: [
            { senderId: blockerId, receiverId: blockedId },
            { senderId: blockedId, receiverId: blockerId },
          ],
        },
      }),
      db.follow.deleteMany({
        where: {
          OR: [
            { followerId: blockerId, followingId: blockedId },
            { followerId: blockedId, followingId: blockerId },
          ],
        },
      }),
    ]);

    return block;
  },

  unblockUser: async ({ blockerId, blockedId }) => {
    const existingBlock = await db.userBlock.findUnique({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
    });

    if (!existingBlock) {
      throw new ApiError(404, "Block not found");
    }

    await db.userBlock.delete({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
    });
  },

  getBlockedUsers: async (userId, queryParams) => {
    const { skip, take, where, orderBy } = buildQueryOptions({
      ...queryParams,
      searchFields: [
        "blocked.firstName",
        "blocked.lastName",
        "blocked.username",
      ],
      defaultFields: [
        "blocked.firstName",
        "blocked.lastName",
        "blocked.username",
      ],
      sortBy: queryParams.sortBy || "createdAt",
      order: queryParams.order || "desc",
    });

    const mainWhere = {
      blockerId: userId,
      ...(where.OR && {
        blocked: { OR: where.OR.map((c) => c.blocked || c) },
      }),
    };

    const totalCount = await db.userBlock.count({ where: mainWhere });

    const blockedUsers = await db.userBlock.findMany({
      where: mainWhere,
      skip,
      take,
      include: {
        blocked: {
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
      orderBy,
    });

    return {
      data: blockedUsers,
      pagination: {
        total: totalCount,
        page: Number(queryParams.page) || 1,
        limit: Number(queryParams.limit) || 10,
        totalPages: Math.ceil(totalCount / (Number(queryParams.limit) || 10)),
      },
    };
  },

  checkIfBlocked: async ({ userId, targetUserId }) => {
    const iBlockedThem = await db.userBlock.findUnique({
      where: {
        blockerId_blockedId: { blockerId: userId, blockedId: targetUserId },
      },
    });

    const theyBlockedMe = await db.userBlock.findUnique({
      where: {
        blockerId_blockedId: { blockerId: targetUserId, blockedId: userId },
      },
    });

    return {
      iBlockedThem: !!iBlockedThem,
      theyBlockedMe: !!theyBlockedMe,
      isBlocked: !!iBlockedThem || !!theyBlockedMe,
    };
  },

  getMutualFollowers: async (userId, targetUserId, queryParams) => {
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new ApiError(404, "User not found");
    }

    const { skip, take, where, orderBy } = buildQueryOptions({
      ...queryParams,
      searchFields: [
        "follower.firstName",
        "follower.lastName",
        "follower.username",
      ],
      defaultFields: [
        "follower.firstName",
        "follower.lastName",
        "follower.username",
      ],
      sortBy: queryParams.sortBy || "createdAt",
      order: queryParams.order || "desc",
    });

    const myFollowers = await db.follow.findMany({
      where: { followingId: userId },
      select: { followerId: true },
    });

    const theirFollowers = await db.follow.findMany({
      where: { followingId: targetUserId },
      select: { followerId: true },
    });

    const myFollowerIds = myFollowers.map((f) => f.followerId);
    const theirFollowerIds = theirFollowers.map((f) => f.followerId);

    const mutualFollowerIds = myFollowerIds.filter((id) =>
      theirFollowerIds.includes(id),
    );

    if (mutualFollowerIds.length === 0) {
      return {
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: Number(queryParams.limit) || 10,
          totalPages: 0,
        },
      };
    }

    const mainWhere = {
      id: { in: mutualFollowerIds },
      ...(where.OR && { OR: where.OR }),
    };

    const totalCount = await db.user.count({ where: mainWhere });

    const mutualFollowers = await db.user.findMany({
      where: mainWhere,
      skip,
      take,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        profilePhoto: true,
        headline: true,
      },
      orderBy: orderBy.createdAt ? { createdAt: orderBy.createdAt } : undefined,
    });

    return {
      data: mutualFollowers,
      pagination: {
        total: totalCount,
        page: Number(queryParams.page) || 1,
        limit: Number(queryParams.limit) || 10,
        totalPages: Math.ceil(totalCount / (Number(queryParams.limit) || 10)),
      },
    };
  },

  getMutualFollowing: async (userId, targetUserId, queryParams) => {
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new ApiError(404, "User not found");
    }

    const { skip, take, where, orderBy } = buildQueryOptions({
      ...queryParams,
      searchFields: [
        "following.firstName",
        "following.lastName",
        "following.username",
      ],
      defaultFields: [
        "following.firstName",
        "following.lastName",
        "following.username",
      ],
      sortBy: queryParams.sortBy || "createdAt",
      order: queryParams.order || "desc",
    });

    const myFollowing = await db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const theirFollowing = await db.follow.findMany({
      where: { followerId: targetUserId },
      select: { followingId: true },
    });

    const myFollowingIds = myFollowing.map((f) => f.followingId);
    const theirFollowingIds = theirFollowing.map((f) => f.followingId);

    const mutualFollowingIds = myFollowingIds.filter((id) =>
      theirFollowingIds.includes(id),
    );

    if (mutualFollowingIds.length === 0) {
      return {
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: Number(queryParams.limit) || 10,
          totalPages: 0,
        },
      };
    }

    const mainWhere = {
      id: { in: mutualFollowingIds },
      ...(where.OR && { OR: where.OR }),
    };

    const totalCount = await db.user.count({ where: mainWhere });

    const mutualFollowing = await db.user.findMany({
      where: mainWhere,
      skip,
      take,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        profilePhoto: true,
        headline: true,
      },
      orderBy: orderBy.createdAt ? { createdAt: orderBy.createdAt } : undefined,
    });

    return {
      data: mutualFollowing,
      pagination: {
        total: totalCount,
        page: Number(queryParams.page) || 1,
        limit: Number(queryParams.limit) || 10,
        totalPages: Math.ceil(totalCount / (Number(queryParams.limit) || 10)),
      },
    };
  },

  getMutualConnections: async (userId, targetUserId, queryParams) => {
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    });

    if (!targetUser) {
      throw new ApiError(404, "User not found");
    }

    const { skip, take, where, orderBy } = buildQueryOptions({
      ...queryParams,
      searchFields: ["firstName", "lastName", "username"],
      defaultFields: ["firstName", "lastName", "username"],
      sortBy: queryParams.sortBy || "createdAt",
      order: queryParams.order || "desc",
    });

    const myConnections = await db.connection.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      select: { senderId: true, receiverId: true },
    });

    const theirConnections = await db.connection.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ senderId: targetUserId }, { receiverId: targetUserId }],
      },
      select: { senderId: true, receiverId: true },
    });

    const myConnectionIds = myConnections.map((c) =>
      c.senderId === userId ? c.receiverId : c.senderId,
    );

    const theirConnectionIds = theirConnections.map((c) =>
      c.senderId === targetUserId ? c.receiverId : c.senderId,
    );

    const mutualConnectionIds = myConnectionIds.filter((id) =>
      theirConnectionIds.includes(id),
    );

    if (mutualConnectionIds.length === 0) {
      return {
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: Number(queryParams.limit) || 10,
          totalPages: 0,
        },
      };
    }

    const mainWhere = {
      id: { in: mutualConnectionIds },
      ...(where.OR && { OR: where.OR }),
    };

    const totalCount = await db.user.count({ where: mainWhere });

    const mutualConnections = await db.user.findMany({
      where: mainWhere,
      skip,
      take,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        profilePhoto: true,
        headline: true,
      },
      orderBy: orderBy.createdAt ? { createdAt: orderBy.createdAt } : undefined,
    });

    return {
      data: mutualConnections,
      pagination: {
        total: totalCount,
        page: Number(queryParams.page) || 1,
        limit: Number(queryParams.limit) || 10,
        totalPages: Math.ceil(totalCount / (Number(queryParams.limit) || 10)),
      },
    };
  },

  checkRelationships: async (userId, targetUserIds) => {
    const myFollows = await db.follow.findMany({
      where: {
        followerId: userId,
        followingId: { in: targetUserIds },
      },
      select: { followingId: true },
    });

    const followingMe = await db.follow.findMany({
      where: {
        followerId: { in: targetUserIds },
        followingId: userId,
      },
      select: { followerId: true },
    });

    const connections = await db.connection.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: { in: targetUserIds } },
          { senderId: { in: targetUserIds }, receiverId: userId },
        ],
      },
      select: { senderId: true, receiverId: true, status: true },
    });

    const blocks = await db.userBlock.findMany({
      where: {
        OR: [
          { blockerId: userId, blockedId: { in: targetUserIds } },
          { blockerId: { in: targetUserIds }, blockedId: userId },
        ],
      },
      select: { blockerId: true, blockedId: true },
    });

    const relationships = {};

    targetUserIds.forEach((targetId) => {
      const isFollowing = myFollows.some((f) => f.followingId === targetId);
      const isFollower = followingMe.some((f) => f.followerId === targetId);

      const connection = connections.find(
        (c) =>
          (c.senderId === userId && c.receiverId === targetId) ||
          (c.senderId === targetId && c.receiverId === userId),
      );

      const iBlockedThem = blocks.some(
        (b) => b.blockerId === userId && b.blockedId === targetId,
      );
      const theyBlockedMe = blocks.some(
        (b) => b.blockerId === targetId && b.blockedId === userId,
      );

      relationships[targetId] = {
        userId: targetId,
        isFollowing,
        isFollower,
        connectionStatus: connection
          ? {
              status: connection.status,
              isSender: connection.senderId === userId,
            }
          : null,
        isBlocked: iBlockedThem || theyBlockedMe,
        iBlockedThem,
        theyBlockedMe,
      };
    });

    return relationships;
  },

  checkFollowers: async (userId, targetUserIds) => {
    const followers = await db.follow.findMany({
      where: {
        followerId: { in: targetUserIds },
        followingId: userId,
      },
      select: { followerId: true, createdAt: true },
    });

    const followerMap = {};

    targetUserIds.forEach((targetId) => {
      const follower = followers.find((f) => f.followerId === targetId);
      followerMap[targetId] = {
        userId: targetId,
        isFollowing: !!follower,
        followedAt: follower ? follower.createdAt : null,
      };
    });

    return followerMap;
  },
};
