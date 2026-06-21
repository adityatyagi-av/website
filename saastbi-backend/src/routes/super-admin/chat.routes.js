import { Router } from "express";
import { SuperAdminChatController } from "../../controllers/common/chat.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const superAdminChatRouter = Router();

superAdminChatRouter.get("/chats", authenticate, SuperAdminChatController.getAllChats);
superAdminChatRouter.get("/chats/search-tenants", authenticate, SuperAdminChatController.searchTenantAdmins);
superAdminChatRouter.get("/chats/history/:tenantId", authenticate, SuperAdminChatController.getChatHistory);

export { superAdminChatRouter };
