import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { UniversalChatController } from "../../controllers/common/universal-chat.controller.js";

const UniversalChatRouter = Router();

// Create or get existing conversation
UniversalChatRouter.post(
  "/conversation",
  authenticate,
  UniversalChatController.getOrCreateConversation,
);

UniversalChatRouter.get(
  "/conversations",
  authenticate,
  UniversalChatController.getConversations,
);

UniversalChatRouter.get(
  "/conversations/unread-count",
  authenticate,
  UniversalChatController.getUnreadCount,
);

UniversalChatRouter.get(
  "/conversation/:conversationId",
  authenticate,
  UniversalChatController.getConversationById,
);

UniversalChatRouter.get(
  "/conversation/:conversationId/messages",
  authenticate,
  UniversalChatController.getMessages,
);

UniversalChatRouter.post(
  "/conversation/:conversationId/message",
  authenticate,
  UniversalChatController.sendMessage,
);

UniversalChatRouter.post(
  "/conversation/:conversationId/read",
  authenticate,
  UniversalChatController.markAsRead,
);

UniversalChatRouter.delete(
  "/message/:messageId",
  authenticate,
  UniversalChatController.deleteMessage,
);

UniversalChatRouter.put(
  "/message/:messageId",
  authenticate,
  UniversalChatController.editMessage,
);

export { UniversalChatRouter };
