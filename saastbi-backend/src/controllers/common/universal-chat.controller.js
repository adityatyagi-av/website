import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";
import { UniversalChatService } from "../../services/common/universal-chat.service.js";
import { validateSendPermission } from "../../utils/chat/send-guard.js";

const resolveSender = async (req) => {
  const source = { ...(req.query || {}), ...(req.body || {}) };
  const { senderType = "USER", startupId, pageId, tenantId, incubationUserId } = source;
  const userId = req.user.id;

  if (senderType === "STARTUP" && startupId) {
    const guard = await validateSendPermission(userId, startupId, "STARTUP");
    if (!guard.allowed) return { error: guard.reason };
    return { senderId: startupId, senderType: "STARTUP" };
  }
  if (senderType === "PAGE" && pageId) {
    const guard = await validateSendPermission(userId, pageId, "PAGE");
    if (!guard.allowed) return { error: guard.reason };
    return { senderId: pageId, senderType: "PAGE" };
  }
  if (senderType === "TENANT" && tenantId) {
    const guard = await validateSendPermission(userId, tenantId, "TENANT");
    if (!guard.allowed) return { error: guard.reason };
    return { senderId: tenantId, senderType: "TENANT" };
  }
  if (senderType === "INCUBATION_USER" && incubationUserId) {
    const guard = await validateSendPermission(userId, incubationUserId, "INCUBATION_USER");
    if (!guard.allowed) return { error: guard.reason };
    return { senderId: incubationUserId, senderType: "INCUBATION_USER" };
  }
  return { senderId: userId, senderType: "USER" };
};

export const UniversalChatController = {
  getOrCreateConversation: asyncHandler(async (req, res) => {
    const { receiverId, receiverType = "USER", contextType, contextId } = req.body;
    if (!receiverId) {
      return apiResponse.sendError(res, "receiverId is required", 400);
    }
    const sender = await resolveSender(req);
    if (sender.error) {
      return apiResponse.sendError(res, sender.error, 403);
    }
    const conversation = await UniversalChatService.getOrCreateConversation(
      sender.senderId, sender.senderType, receiverId, receiverType, contextType, contextId
    );
    return apiResponse.sendSuccess(res, conversation, "Conversation ready", 200);
  }),

  getConversations: asyncHandler(async (req, res) => {
    const result = await UniversalChatService.getConversations(req.user.id, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  getConversationById: asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const conversation = await UniversalChatService.getConversationById(req.user.id, conversationId, req.query);
    return apiResponse.sendSuccess(res, conversation);
  }),

  getMessages: asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const messages = await UniversalChatService.getMessages(req.user.id, conversationId, req.query);
    return apiResponse.sendSuccess(res, messages);
  }),

  sendMessage: asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const sender = await resolveSender(req);
    if (sender.error) {
      return apiResponse.sendError(res, sender.error, 403);
    }
    const metadata = {
      actualSenderName: `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim(),
      actualSenderAvatar: req.user.profilePhoto,
      actualSenderId: req.user.id,
    };
    const result = await UniversalChatService.sendMessage(
      sender.senderId, sender.senderType, conversationId,
      { ...req.body, metadata }
    );
    return apiResponse.sendSuccess(res, result.message, "Message sent", 201);
  }),

  markAsRead: asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const { entityId, entityType } = req.body;
    await UniversalChatService.markAsRead(req.user.id, conversationId, entityId, entityType);
    return apiResponse.sendSuccess(res, null, "Marked as read");
  }),

  deleteMessage: asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const sender = await resolveSender(req);
    if (sender.error) {
      return apiResponse.sendError(res, sender.error, 403);
    }
    await UniversalChatService.deleteMessage(sender.senderId, messageId);
    return apiResponse.sendSuccess(res, null, "Message deleted");
  }),

  editMessage: asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { content } = req.body;
    const sender = await resolveSender(req);
    if (sender.error) {
      return apiResponse.sendError(res, sender.error, 403);
    }
    const message = await UniversalChatService.editMessage(sender.senderId, messageId, content);
    return apiResponse.sendSuccess(res, message, "Message updated");
  }),

  getUnreadCount: asyncHandler(async (req, res) => {
    const result = await UniversalChatService.getUnreadCount(req.user.id, req.query);
    return apiResponse.sendSuccess(res, result);
  }),
};
