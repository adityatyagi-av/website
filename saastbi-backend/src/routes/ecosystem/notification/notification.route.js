import { Router } from "express";
import { authenticate } from "../../../middlewares/auth.middleware.js";
import { NotificationController } from "../../../controllers/ecosystem/notification/notification.controller.js";
import { NotificationValidation, validate } from "../../../validators/notification.validator.js";

const NotificationRouter = Router();

NotificationRouter.get(
  "/notification",
  authenticate,
  validate(NotificationValidation.getNotifications),
  NotificationController.getNotifications
);

NotificationRouter.get(
  "/notification/unread-count",
  authenticate,
  NotificationController.getUnreadCount
);

NotificationRouter.get(
  "/notification/preferences",
  authenticate,
  NotificationController.getPreferences
);

NotificationRouter.put(
  "/notification/preferences",
  authenticate,
  validate(NotificationValidation.updatePreferences),
  NotificationController.updatePreferences
);

NotificationRouter.patch(
  "/notification/read-all",
  authenticate,
  validate(NotificationValidation.markAllAsRead),
  NotificationController.markAllAsRead
);

NotificationRouter.delete(
  "/notification/clear",
  authenticate,
  NotificationController.clearArchived
);

NotificationRouter.get(
  "/notification/:id",
  authenticate,
  NotificationController.getById
);

NotificationRouter.patch(
  "/notification/:id/read",
  authenticate,
  NotificationController.markAsRead
);

NotificationRouter.delete(
  "/notification/:id",
  authenticate,
  NotificationController.archiveNotification
);

export default NotificationRouter;
