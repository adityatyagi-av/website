import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";
import { UniversalChatService } from "../../../services/common/universal-chat.service.js";
import db from "../../../db/db.js";

export const IncubationUniversalChatController = {
  getOrCreateConversation: asyncHandler(async (req, res) => {
    const { receiverId, receiverType = "USER", contextType, contextId } = req.body;
    if (!receiverId) {
      return apiResponse.sendError(res, "receiverId is required", 400);
    }
    const tenantId = req.user.tenantId;
    const conversation = await UniversalChatService.getOrCreateConversation(
      tenantId, "TENANT", receiverId, receiverType, contextType, contextId
    );
    return apiResponse.sendSuccess(res, conversation, "Conversation ready", 200);
  }),

  getConversations: asyncHandler(async (req, res) => {
    const tenantId = req.user.tenantId;
    const query = { ...req.query, entityId: tenantId, entityType: "TENANT" };
    const result = await UniversalChatService.getConversations(req.user.id, query);
    return apiResponse.sendSuccess(res, result);
  }),

  getConversationById: asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const tenantId = req.user.tenantId;
    const query = { ...req.query, entityId: tenantId, entityType: "TENANT" };
    const conversation = await UniversalChatService.getConversationById(req.user.id, conversationId, query);
    return apiResponse.sendSuccess(res, conversation);
  }),

  getMessages: asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const tenantId = req.user.tenantId;
    const query = { ...req.query, entityId: tenantId, entityType: "TENANT" };
    const messages = await UniversalChatService.getMessages(req.user.id, conversationId, query);
    return apiResponse.sendSuccess(res, messages);
  }),

  sendMessage: asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const tenantId = req.user.tenantId;
    const user = await db.user.findUnique({
      where: { id: req.user.id },
      select: { firstName: true, lastName: true, profilePhoto: true },
    });
    const metadata = {
      actualSenderName: `${user?.firstName || ""} ${user?.lastName || ""}`.trim(),
      actualSenderAvatar: user?.profilePhoto || null,
      actualSenderId: req.user.id,
    };
    const result = await UniversalChatService.sendMessage(
      tenantId, "TENANT", conversationId,
      { ...req.body, metadata }
    );
    return apiResponse.sendSuccess(res, result.message, "Message sent", 201);
  }),

  markAsRead: asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const tenantId = req.user.tenantId;
    await UniversalChatService.markAsRead(req.user.id, conversationId, tenantId, "TENANT");
    return apiResponse.sendSuccess(res, null, "Marked as read");
  }),

  deleteMessage: asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const tenantId = req.user.tenantId;
    await UniversalChatService.deleteMessage(tenantId, messageId);
    return apiResponse.sendSuccess(res, null, "Message deleted");
  }),

  editMessage: asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { content } = req.body;
    const tenantId = req.user.tenantId;
    const message = await UniversalChatService.editMessage(tenantId, messageId, content);
    return apiResponse.sendSuccess(res, message, "Message updated");
  }),

  getUnreadCount: asyncHandler(async (req, res) => {
    const tenantId = req.user.tenantId;
    const query = { entityId: tenantId, entityType: "TENANT" };
    const result = await UniversalChatService.getUnreadCount(req.user.id, query);
    return apiResponse.sendSuccess(res, result);
  }),
};
