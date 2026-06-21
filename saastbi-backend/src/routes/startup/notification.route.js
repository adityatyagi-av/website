import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { StartupNotificationController } from "../../controllers/startup/notification.controller.js";
import { NotificationValidation, validate } from "../../validators/notification.validator.js";

const StartupNotificationRouter = Router();

StartupNotificationRouter.get(
  "/notification",
  authenticate,
  validate(NotificationValidation.getNotifications),
  StartupNotificationController.getNotifications
);

StartupNotificationRouter.get(
  "/notification/unread-count",
  authenticate,
  StartupNotificationController.getUnreadCount
);

StartupNotificationRouter.get(
  "/notification/preferences",
  authenticate,
  StartupNotificationController.getPreferences
);

StartupNotificationRouter.put(
  "/notification/preferences",
  authenticate,
  validate(NotificationValidation.updatePreferences),
  StartupNotificationController.updatePreferences
);

StartupNotificationRouter.patch(
  "/notification/read-all",
  authenticate,
  validate(NotificationValidation.markAllAsRead),
  StartupNotificationController.markAllAsRead
);

StartupNotificationRouter.delete(
  "/notification/clear",
  authenticate,
  StartupNotificationController.clearArchived
);

StartupNotificationRouter.get(
  "/notification/:id",
  authenticate,
  StartupNotificationController.getById
);

StartupNotificationRouter.patch(
  "/notification/:id/read",
  authenticate,
  StartupNotificationController.markAsRead
);

StartupNotificationRouter.delete(
  "/notification/:id",
  authenticate,
  StartupNotificationController.archiveNotification
);

export default StartupNotificationRouter;

