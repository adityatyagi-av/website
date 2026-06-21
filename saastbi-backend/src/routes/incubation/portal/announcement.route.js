import { Router } from "express";
import { AnnouncementController } from "../../../controllers/incubation/portal/announcement.controller.js";
import { authenticatePortal } from "../../../middlewares/portal.auth.middleware.js";
import { requireAccessByMethod } from "../../../middlewares/access.middleware.js";
import { MODULE_KEYS } from "../../../config/modules.registry.js";

const AnnouncementRouter = Router();

AnnouncementRouter.use(["/announcement", "/announcements"], authenticatePortal, requireAccessByMethod(MODULE_KEYS.ANNOUNCEMENT));

AnnouncementRouter.post("/announcement", AnnouncementController.createAnnouncement);
AnnouncementRouter.get("/announcements", AnnouncementController.getAllAnnouncements);
AnnouncementRouter.get("/announcements/stats", AnnouncementController.getAnnouncementStats);
AnnouncementRouter.get("/announcement/:id", AnnouncementController.getAnnouncementById);
AnnouncementRouter.put("/announcement/:id", AnnouncementController.updateAnnouncement);
AnnouncementRouter.delete("/announcement/:id", AnnouncementController.deleteAnnouncement);
AnnouncementRouter.patch("/announcement/:id/publish", AnnouncementController.publishAnnouncement);
AnnouncementRouter.patch("/announcement/:id/unpublish", AnnouncementController.unpublishAnnouncement);
AnnouncementRouter.patch("/announcement/:id/pin", AnnouncementController.pinAnnouncement);
AnnouncementRouter.patch("/announcement/:id/unpin", AnnouncementController.unpinAnnouncement);
AnnouncementRouter.patch("/announcement/:id/restore", AnnouncementController.restoreAnnouncement);
AnnouncementRouter.get("/announcement/:id/reads", AnnouncementController.getAnnouncementReads);
AnnouncementRouter.post("/announcement/:id/targets", AnnouncementController.addTargets);
AnnouncementRouter.delete("/announcement/:id/targets", AnnouncementController.removeTargets);
AnnouncementRouter.get("/announcement/:id/targets", AnnouncementController.getTargets);
AnnouncementRouter.post("/announcement/:id/exclude", AnnouncementController.addExclusions);
AnnouncementRouter.delete("/announcement/:id/exclude/:exclusionId", AnnouncementController.removeExclusion);
AnnouncementRouter.post("/announcement/:id/attachment", AnnouncementController.addAttachment);
AnnouncementRouter.delete("/announcement/:id/attachment/:attachmentId", AnnouncementController.removeAttachment);

export default AnnouncementRouter;
