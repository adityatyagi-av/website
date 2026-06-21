import { Router } from "express";
import { PortalChatController } from "../../../controllers/common/chat.controller.js";
import { IncubationUniversalChatController } from "../../../controllers/incubation/portal/universal-chat.controller.js";
import { authenticatePortal } from "../../../middlewares/portal.auth.middleware.js";
import { requireAccessByMethod } from "../../../middlewares/access.middleware.js";
import { MODULE_KEYS } from "../../../config/modules.registry.js";

const router = Router();

router.use(["/support-chat", "/conversation", "/conversations", "/message"], authenticatePortal, requireAccessByMethod(MODULE_KEYS.CHAT));

// Support chat (tenant-to-superadmin)
router.get("/support-chat", PortalChatController.getMyChat);
router.get("/support-chat/history", PortalChatController.getChatHistory);
router.post("/support-chat/mark-read", PortalChatController.markAsRead);

// Universal chat (tenant-to-user/startup/page)
router.post("/conversation", IncubationUniversalChatController.getOrCreateConversation);
router.get("/conversations", IncubationUniversalChatController.getConversations);
router.get("/conversations/unread-count", IncubationUniversalChatController.getUnreadCount);
router.get("/conversation/:conversationId", IncubationUniversalChatController.getConversationById);
router.get("/conversation/:conversationId/messages", IncubationUniversalChatController.getMessages);
router.post("/conversation/:conversationId/message", IncubationUniversalChatController.sendMessage);
router.post("/conversation/:conversationId/read", IncubationUniversalChatController.markAsRead);
router.delete("/message/:messageId", IncubationUniversalChatController.deleteMessage);
router.put("/message/:messageId", IncubationUniversalChatController.editMessage);

export const PortalChatRouter = router;
