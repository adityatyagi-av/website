import db from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";
import { resolveEntity } from "../../utils/chat/entity-resolver.js";
import { canMessage } from "../../utils/chat/permissions.js";
import { resolveEntityAccess, buildInboxWhere, resolveStartupEntityIds, getUserOwnedEntityIds } from "../../utils/chat/inbox-scope.js";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Enrich a conversation with resolved participant details and last message.
 * `currentParticipantId` + `currentParticipantType` determine the "self" side.
 */
const enrichConversation = async (conversation, currentParticipantId, currentParticipantType) => {
  const [p1, p2] = await Promise.all([
    resolveEntity(conversation.participant1Type, conversation.participant1Id),
    resolveEntity(conversation.participant2Type, conversation.participant2Id),
  ]);

  const participants = [
    { entityId: p1.id, entityType: conversation.participant1Type, ...p1 },
    { entityId: p2.id, entityType: conversation.participant2Type, ...p2 },
  ];

  let lastMessage = null;
  const lastMsg = await db.message.findFirst({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
  });

  if (lastMsg) {
    const sender = await resolveEntity(lastMsg.senderType, lastMsg.senderId);
    lastMessage = {
      ...lastMsg,
      sender: { id: sender.id, name: sender.name, avatar: sender.avatar, type: sender.type },
    };
    // Show sentBy only to members of the same entity
    if (lastMsg.metadata?.actualSenderId) {
      const viewerIsSenderEntity =
        lastMsg.senderId === currentParticipantId && lastMsg.senderType === currentParticipantType;
      if (viewerIsSenderEntity) {
        lastMessage.sender.sentBy = {
          id: lastMsg.metadata.actualSenderId,
          name: lastMsg.metadata.actualSenderName || null,
          avatar: lastMsg.metadata.actualSenderAvatar || null,
        };
      }
    }
  }

  let unreadCount = 0;
  if (currentParticipantId === conversation.participant1Id &&
      currentParticipantType === conversation.participant1Type) {
    unreadCount = conversation.unreadCount1;
  } else if (currentParticipantId === conversation.participant2Id &&
             currentParticipantType === conversation.participant2Type) {
    unreadCount = conversation.unreadCount2;
  }

  return {
    ...conversation,
    participants,
    lastMessage,
    unreadCount,
    otherParticipants: participants.filter(
      (p) => !(p.entityId === currentParticipantId && p.entityType === currentParticipantType)
    ),
  };
};

/**
 * If a Page belongs to a Startup or Tenant, return the owning entity.
 * Used to canonicalize conversation participants so we never store PAGE
 * as a participant when it has an owning STARTUP/TENANT.
 */
async function resolvePageOwner(pageId) {
  const startup = await db.startup.findFirst({
    where: { pageId },
    select: { id: true },
  });
  if (startup) return { id: startup.id, type: "STARTUP" };

  const tenant = await db.tenant.findFirst({
    where: { pageId },
    select: { id: true },
  });
  if (tenant) return { id: tenant.id, type: "TENANT" };

  return null;
}

/**
 * When an entity (e.g. STARTUP) tries to send on a conversation but is not
 * directly a participant, check if a related entity they control IS a participant.
 * Example: startup sends but the conversation's participant is a PAGE owned by that startup.
 */
async function resolveRelatedParticipant(conversation, senderId, senderType) {
  if (senderType === "STARTUP") {
    // Startup owns a page via Startup.pageId
    const pageCandidates = [];
    if (conversation.participant1Type === "PAGE") pageCandidates.push(conversation.participant1Id);
    if (conversation.participant2Type === "PAGE") pageCandidates.push(conversation.participant2Id);

    if (pageCandidates.length > 0) {
      const startup = await db.startup.findUnique({
        where: { id: senderId },
        select: { pageId: true },
      });
      if (startup?.pageId && pageCandidates.includes(startup.pageId)) {
        return { participantId: startup.pageId, participantType: "PAGE" };
      }
    }
  }
  return null;
}

// ============================================================================
// SERVICE
// ============================================================================

export const UniversalChatService = {
  getOrCreateConversation: async (
    senderId,
    senderType = "USER",
    receiverId,
    receiverType = "USER",
    contextType,
    contextId,
  ) => {
    // Canonicalize: if a PAGE is targeted but belongs to a Startup/Tenant,
    // redirect to the owning entity to prevent duplicate conversations
    if (senderType === "PAGE") {
      const owner = await resolvePageOwner(senderId);
      if (owner) { senderId = owner.id; senderType = owner.type; }
    }
    if (receiverType === "PAGE") {
      const owner = await resolvePageOwner(receiverId);
      if (owner) { receiverId = owner.id; receiverType = owner.type; }
    }

    const permCheck = await canMessage(senderId, senderType, receiverId, receiverType, contextType);
    if (!permCheck.allowed) {
      throw new ApiError(403, permCheck.reason);
    }

    let conversation = await db.conversation.findFirst({
      where: {
        AND: [
          {
            OR: [
              {
                participant1Type: senderType,
                participant1Id: senderId,
                participant2Type: receiverType,
                participant2Id: receiverId,
              },
              {
                participant1Type: receiverType,
                participant1Id: receiverId,
                participant2Type: senderType,
                participant2Id: senderId,
              },
            ],
          },
          { contextType: contextType || "GENERAL" },
          { contextId: contextId || null },
        ],
      },
    });

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          participant1Type: senderType,
          participant1Id: senderId,
          participant2Type: receiverType,
          participant2Id: receiverId,
          contextType: contextType || "GENERAL",
          contextId: contextId || null,
          isActive: true,
        },
      });
    }

    return await enrichConversation(conversation, senderId, senderType);
  },

  getConversations: async (userId, query) => {
    const { contextType, entityId, entityType, search = "", page = 1, limit = 20 } = query;
    const pageNumber = parseInt(page);
    const pageLimit = parseInt(limit);
    const skip = (pageNumber - 1) * pageLimit;

    const { participantId, participantType } = await resolveEntityAccess(userId, entityId, entityType);

    const additionalFilters = {};
    if (contextType) {
      additionalFilters.contextType = contextType;
    }

    // For startups, also include conversations where the startup's pages are participants
    let relatedEntities = null;
    if (participantType === "STARTUP") {
      relatedEntities = await resolveStartupEntityIds(participantId);
    }

    // For personal inbox, exclude entity conversations that belong in entity inboxes
    let excludeEntityIds = null;
    if (participantType === "USER") {
      excludeEntityIds = await getUserOwnedEntityIds(userId);
    }

    const where = buildInboxWhere(participantId, participantType, additionalFilters, relatedEntities, excludeEntityIds);

    let conversations = [];
    let total = 0;

    if (search.trim()) {
      const allConversations = await db.conversation.findMany({
        where,
        orderBy: { updatedAt: "desc" },
      });
      let conversationsWithDetails = await Promise.all(
        allConversations.map((conv) => enrichConversation(conv, participantId, participantType)),
      );
      const keyword = search.trim().toLowerCase();
      conversationsWithDetails = conversationsWithDetails.filter((c) =>
        c.otherParticipants?.some((participant) =>
          participant.name?.toLowerCase().includes(keyword),
        ),
      );
      total = conversationsWithDetails.length;
      conversations = conversationsWithDetails.slice(skip, skip + pageLimit);
    } else {
      const [conversationList, conversationCount] = await Promise.all([
        db.conversation.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip,
          take: pageLimit,
        }),
        db.conversation.count({ where }),
      ]);
      conversations = await Promise.all(
        conversationList.map((conv) => enrichConversation(conv, participantId, participantType)),
      );
      total = conversationCount;
    }

    return {
      conversations,
      pagination: {
        page: pageNumber,
        limit: pageLimit,
        total,
        totalPages: Math.ceil(total / pageLimit),
      },
    };
  },

  getConversationById: async (userId, conversationId, query = {}) => {
    const { entityId, entityType } = query;
    const { participantId, participantType } = await resolveEntityAccess(userId, entityId, entityType);

    let orConditions = [
      { participant1Id: participantId, participant1Type: participantType },
      { participant2Id: participantId, participant2Type: participantType },
    ];

    if (participantType === "STARTUP") {
      const related = await resolveStartupEntityIds(participantId);
      related.forEach((e) => {
        if (e.id !== participantId || e.type !== participantType) {
          orConditions.push({ participant1Id: e.id, participant1Type: e.type });
          orConditions.push({ participant2Id: e.id, participant2Type: e.type });
        }
      });
    }

    const conversation = await db.conversation.findFirst({
      where: { id: conversationId, OR: orConditions },
    });

    if (!conversation) {
      throw new ApiError(404, "Conversation not found");
    }

    return await enrichConversation(conversation, participantId, participantType);
  },

  getMessages: async (userId, conversationId, query) => {
    const { before, after, limit = 50, entityId, entityType } = query;
    const { participantId, participantType } = await resolveEntityAccess(userId, entityId, entityType);

    let orConditions = [
      { participant1Id: participantId, participant1Type: participantType },
      { participant2Id: participantId, participant2Type: participantType },
    ];

    if (participantType === "STARTUP") {
      const related = await resolveStartupEntityIds(participantId);
      related.forEach((e) => {
        if (e.id !== participantId || e.type !== participantType) {
          orConditions.push({ participant1Id: e.id, participant1Type: e.type });
          orConditions.push({ participant2Id: e.id, participant2Type: e.type });
        }
      });
    }

    const conversation = await db.conversation.findFirst({
      where: { id: conversationId, OR: orConditions },
    });

    if (!conversation) {
      throw new ApiError(404, "Conversation not found");
    }

    const msgWhere = { conversationId };
    if (before) {
      msgWhere.createdAt = { lt: new Date(before) };
    }
    if (after) {
      msgWhere.createdAt = { ...msgWhere.createdAt, gt: new Date(after) };
    }

    const messages = await db.message.findMany({
      where: msgWhere,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
      include: {
        replyTo: {
          select: {
            id: true,
            content: true,
            senderId: true,
            senderType: true,
            messageType: true,
            attachments: true,
            isDeleted: true,
            createdAt: true,
          },
        },
      },
    });

    const senderKeys = new Set();
    messages.forEach((msg) => {
      senderKeys.add(`${msg.senderType}::${msg.senderId}`);
      if (msg.replyTo) {
        senderKeys.add(`${msg.replyTo.senderType}::${msg.replyTo.senderId}`);
      }
    });

    const senderMap = new Map();
    await Promise.all(
      Array.from(senderKeys).map(async (key) => {
        const [type, id] = key.split("::");
        try {
          const entity = await resolveEntity(type, id);
          senderMap.set(key, {
            id: entity.id,
            name: entity.name,
            avatar: entity.avatar,
            type: entity.type,
          });
        } catch {
          senderMap.set(key, { id, name: "Unknown", avatar: null, type });
        }
      }),
    );

    const enrichedMessages = messages.map((msg) => {
      const sender = { ...senderMap.get(`${msg.senderType}::${msg.senderId}`) };

      // Show sentBy (which team member sent) only if the viewer is a member of
      // the same entity that sent the message. External parties only see entity name.
      if (msg.metadata?.actualSenderId) {
        const viewerIsEntityMember =
          msg.senderId === participantId && msg.senderType === participantType;
        if (viewerIsEntityMember) {
          sender.sentBy = {
            id: msg.metadata.actualSenderId,
            name: msg.metadata.actualSenderName || null,
            avatar: msg.metadata.actualSenderAvatar || null,
          };
        }
      }

      let enrichedReplyTo = null;
      if (msg.replyTo) {
        const replySender = senderMap.get(`${msg.replyTo.senderType}::${msg.replyTo.senderId}`);
        enrichedReplyTo = {
          ...msg.replyTo,
          sender: replySender,
          attachments: msg.replyTo.attachments
            ? JSON.parse(JSON.stringify(msg.replyTo.attachments))
            : [],
        };
      }

      return {
        ...msg,
        sender,
        replyTo: enrichedReplyTo,
        attachments: msg.attachments
          ? JSON.parse(JSON.stringify(msg.attachments))
          : [],
      };
    });

    return enrichedMessages.reverse();
  },

  sendMessage: async (senderId, senderType = "USER", conversationId, data) => {
    const { content, attachments, replyToId, messageType: providedType, metadata } = data;
    let conversation = await db.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { participant1Id: senderId, participant1Type: senderType },
          { participant2Id: senderId, participant2Type: senderType },
        ],
      },
    });

    // If not found with the exact entity, check related entities the sender controls.
    // e.g. a startup user sending on a conversation where their PAGE is the participant.
    if (!conversation && senderType !== "USER") {
      const rawConv = await db.conversation.findUnique({ where: { id: conversationId } });
      if (rawConv) {
        const resolved = await resolveRelatedParticipant(rawConv, senderId, senderType);
        if (resolved) {
          senderId = resolved.participantId;
          senderType = resolved.participantType;
          conversation = rawConv;
        }
      }
    }

    if (!conversation) {
      throw new ApiError(404, "Conversation not found");
    }

    if (conversation.isBlocked) {
      throw new ApiError(403, "This conversation is blocked");
    }

    if (replyToId) {
      const replyTarget = await db.message.findFirst({
        where: { id: replyToId },
        select: { id: true },
      });
      if (!replyTarget) {
        console.warn(`Reply target ${replyToId} not found, sending without reply`);
      }
    }

    let messageType = providedType || "TEXT";
    if (!providedType && attachments && attachments.length > 0) {
      const first = attachments[0];
      if (first.type === "IMAGE") messageType = "IMAGE";
      else if (first.type === "VIDEO") messageType = "VIDEO";
      else if (first.type === "DOCUMENT") messageType = "FILE";
    }

    const message = await db.message.create({
      data: {
        conversationId,
        senderId,
        senderType,
        content: content || null,
        messageType,
        replyToId: replyToId || null,
        attachments: attachments && attachments.length ? attachments : undefined,
        metadata: metadata || undefined,
        isRead: false,
      },
      include: {
        replyTo: {
          select: {
            id: true,
            content: true,
            senderId: true,
            senderType: true,
            messageType: true,
            attachments: true,
            isDeleted: true,
          },
        },
      },
    });

    const isP1 =
      conversation.participant1Id === senderId &&
      conversation.participant1Type === senderType;

    const updateData = {
      lastMessageAt: new Date(),
      lastMessageBy: senderId,
      totalMessages: { increment: 1 },
    };

    if (isP1) {
      updateData.unreadCount2 = { increment: 1 };
    } else {
      updateData.unreadCount1 = { increment: 1 };
    }

    await db.conversation.update({
      where: { id: conversationId },
      data: updateData,
    });

    const sender = await resolveEntity(senderType, senderId);

    let enrichedReplyTo = null;
    if (message.replyTo) {
      const replySender = await resolveEntity(message.replyTo.senderType, message.replyTo.senderId);
      enrichedReplyTo = {
        ...message.replyTo,
        sender: {
          id: replySender.id,
          name: replySender.name,
          avatar: replySender.avatar,
          type: replySender.type,
        },
      };
    }

    const enrichedSender = {
      id: sender.id,
      name: sender.name,
      avatar: sender.avatar,
      type: sender.type,
    };

    if (metadata?.actualSenderId) {
      enrichedSender.sentBy = {
        id: metadata.actualSenderId,
        name: metadata.actualSenderName || null,
        avatar: metadata.actualSenderAvatar || null,
      };
    }

    const enrichedMessage = {
      ...message,
      sender: enrichedSender,
      replyTo: enrichedReplyTo,
    };

    return {
      message: enrichedMessage,
      participantIds: [conversation.participant1Id, conversation.participant2Id],
      participantTypes: [conversation.participant1Type, conversation.participant2Type],
    };
  },

  markAsRead: async (userId, conversationId, entityId, entityType) => {
    let { participantId, participantType } = await resolveEntityAccess(userId, entityId, entityType);

    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) return { success: false };

    let isP1 =
      conversation.participant1Id === participantId &&
      conversation.participant1Type === participantType;
    let isP2 =
      conversation.participant2Id === participantId &&
      conversation.participant2Type === participantType;

    // For startups, check if their page is the actual participant
    if (!isP1 && !isP2 && participantType === "STARTUP") {
      const resolved = await resolveRelatedParticipant(conversation, participantId, participantType);
      if (resolved) {
        isP1 = conversation.participant1Id === resolved.participantId &&
               conversation.participant1Type === resolved.participantType;
        isP2 = conversation.participant2Id === resolved.participantId &&
               conversation.participant2Type === resolved.participantType;
      }
    }

    if (isP1) {
      await db.conversation.update({
        where: { id: conversationId },
        data: { unreadCount1: 0 },
      });
    } else if (isP2) {
      await db.conversation.update({
        where: { id: conversationId },
        data: { unreadCount2: 0 },
      });
    }

    return { success: true };
  },

  deleteMessage: async (senderId, messageId) => {
    const message = await db.message.findFirst({
      where: { id: messageId, senderId },
    });

    if (!message) {
      throw new ApiError(404, "Message not found or you cannot delete this message");
    }

    await db.message.update({
      where: { id: messageId },
      data: { isDeleted: true, deletedAt: new Date(), content: null },
    });

    return { success: true };
  },

  editMessage: async (senderId, messageId, content) => {
    const message = await db.message.findFirst({
      where: { id: messageId, senderId, isDeleted: false },
    });

    if (!message) {
      throw new ApiError(404, "Message not found or you cannot edit this message");
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (message.createdAt < fiveMinutesAgo) {
      throw new ApiError(400, "Messages can only be edited within 5 minutes of sending");
    }

    const updatedMessage = await db.message.update({
      where: { id: messageId },
      data: { content, isEdited: true, editedAt: new Date() },
    });

    return updatedMessage;
  },

  getUnreadCount: async (userId, query = {}) => {
    const { entityId, entityType } = query;
    const { participantId, participantType } = await resolveEntityAccess(userId, entityId, entityType);

    const c1 = await db.conversation.aggregate({
      where: { participant1Id: participantId, participant1Type: participantType },
      _sum: { unreadCount1: true },
    });

    const c2 = await db.conversation.aggregate({
      where: { participant2Id: participantId, participant2Type: participantType },
      _sum: { unreadCount2: true },
    });

    const total = (c1._sum.unreadCount1 || 0) + (c2._sum.unreadCount2 || 0);

    return { unreadCount: total };
  },
};
