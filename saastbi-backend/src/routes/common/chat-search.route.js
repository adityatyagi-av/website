import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { ChatSearchController } from "../../controllers/common/chat-search.controller.js";

const ChatSearchRouter = Router();

// Ecosystem user search
ChatSearchRouter.get(
  "/ecosystem/chat/search",
  authenticate,
  ChatSearchController.searchForUser
);

// Startup portal search
ChatSearchRouter.get(
  "/startup-portal/chat/search",
  authenticate,
  ChatSearchController.searchForStartup
);

// Incubation portal search (tenant admin only)
ChatSearchRouter.get(
  "/incubation-portal/chat/search",
  authenticate,
  ChatSearchController.searchForTenant
);

export { ChatSearchRouter };
