import { Router } from "express";
import { authenticatePortal } from "../../../middlewares/portal.auth.middleware.js";
import { requireAccessByMethod } from "../../../middlewares/access.middleware.js";
import { MODULE_KEYS } from "../../../config/modules.registry.js";
import { PortalNotificationController } from "../../../controllers/incubation/portal/notification.controller.js";
import { NotificationValidation, validate } from "../../../validators/notification.validator.js";

const PortalNotificationRouter = Router();

PortalNotificationRouter.use("/notification", authenticatePortal, requireAccessByMethod(MODULE_KEYS.NOTIFICATION));

PortalNotificationRouter.get("/notification", validate(NotificationValidation.getNotifications), PortalNotificationController.getNotifications);
PortalNotificationRouter.get("/notification/unread-count", PortalNotificationController.getUnreadCount);
PortalNotificationRouter.get("/notification/preferences", PortalNotificationController.getPreferences);
PortalNotificationRouter.put("/notification/preferences", validate(NotificationValidation.updatePreferences), PortalNotificationController.updatePreferences);
PortalNotificationRouter.patch("/notification/read-all", validate(NotificationValidation.markAllAsRead), PortalNotificationController.markAllAsRead);
PortalNotificationRouter.delete("/notification/clear", PortalNotificationController.clearArchived);
PortalNotificationRouter.get("/notification/:id", PortalNotificationController.getById);
PortalNotificationRouter.patch("/notification/:id/read", PortalNotificationController.markAsRead);
PortalNotificationRouter.delete("/notification/:id", PortalNotificationController.archiveNotification);

export default PortalNotificationRouter;
