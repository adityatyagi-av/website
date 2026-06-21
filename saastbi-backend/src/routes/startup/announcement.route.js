import { Router } from "express";
import { StartupAnnouncementController } from "../../controllers/startup/announcement.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const StartupAnnouncementRouter = Router();

StartupAnnouncementRouter.post(
  "/startup/:startupId/announcement",
  authenticate,
  StartupAnnouncementController.createAnnouncement,
);

StartupAnnouncementRouter.get(
  "/startup/:startupId/announcements",
  authenticate,
  StartupAnnouncementController.getAnnouncements,
);

StartupAnnouncementRouter.get(
  "/startup/:startupId/announcement/:id",
  authenticate,
  StartupAnnouncementController.getAnnouncementById,
);

StartupAnnouncementRouter.put(
  "/startup/:startupId/announcement/:id",
  authenticate,
  StartupAnnouncementController.updateAnnouncement,
);

StartupAnnouncementRouter.delete(
  "/startup/:startupId/announcement/:id",
  authenticate,
  StartupAnnouncementController.deleteAnnouncement,
);

StartupAnnouncementRouter.patch(
  "/startup/:startupId/announcement/:id/publish",
  authenticate,
  StartupAnnouncementController.publishAnnouncement,
);

StartupAnnouncementRouter.patch(
  "/startup/:startupId/announcement/:id/pin",
  authenticate,
  StartupAnnouncementController.pinAnnouncement,
);

StartupAnnouncementRouter.get(
  "/startup/:startupId/announcements/received",
  authenticate,
  StartupAnnouncementController.getReceivedAnnouncements,
);

StartupAnnouncementRouter.get(
  "/startup/:startupId/announcements/received/unread-count",
  authenticate,
  StartupAnnouncementController.getUnreadCount,
);

StartupAnnouncementRouter.get(
  "/startup/:startupId/announcements/received/:id",
  authenticate,
  StartupAnnouncementController.getReceivedAnnouncementById,
);

StartupAnnouncementRouter.patch(
  "/startup/:startupId/announcements/received/:id/read",
  authenticate,
  StartupAnnouncementController.markAsRead,
);

export default StartupAnnouncementRouter;
