import { Router } from "express";
import { authenticatePortal } from "../../../middlewares/portal.auth.middleware.js";
import { requireAccessByMethod } from "../../../middlewares/access.middleware.js";
import { MODULE_KEYS } from "../../../config/modules.registry.js";
import { IncubationMentorController } from "../../../controllers/incubation/portal/mentor.controller.js";

const IncubationMentorRouter = Router();

IncubationMentorRouter.use(["/mentor", "/mentors", "/mentor-association", "/mentor-session", "/mentor-sessions", "/mentor-analytics", "/mentor-spending", "/startup"], authenticatePortal, requireAccessByMethod(MODULE_KEYS.MENTOR));

IncubationMentorRouter.get("/mentors/discover", IncubationMentorController.discoverMentors);
IncubationMentorRouter.get("/mentors", IncubationMentorController.getAssociatedMentors);
IncubationMentorRouter.get("/mentors/applications", IncubationMentorController.getPendingApplications);
IncubationMentorRouter.get("/mentor/:mentorId", IncubationMentorController.getMentorProfile);
IncubationMentorRouter.post("/mentor/:mentorId/invite", IncubationMentorController.inviteMentor);
IncubationMentorRouter.post("/mentor-association/:associationId/approve", IncubationMentorController.approveApplication);
IncubationMentorRouter.post("/mentor-association/:associationId/reject", IncubationMentorController.rejectApplication);
IncubationMentorRouter.put("/mentor-association/:associationId", IncubationMentorController.updateAssociation);
IncubationMentorRouter.post("/mentor-association/:associationId/end", IncubationMentorController.endAssociation);
IncubationMentorRouter.get("/mentor-association/:associationId", IncubationMentorController.getAssociationDetails);
IncubationMentorRouter.get("/mentor-association/:associationId/usage", IncubationMentorController.getMentorUsage);
IncubationMentorRouter.get("/mentor-sessions", IncubationMentorController.getAllSessions);
IncubationMentorRouter.get("/mentor-session/:sessionId", IncubationMentorController.getSessionDetails);
IncubationMentorRouter.get("/mentor-analytics", IncubationMentorController.getMentorAnalytics);
IncubationMentorRouter.get("/mentor-spending", IncubationMentorController.getMentorSpending);
IncubationMentorRouter.get("/startup/:startupId/mentor-usage", IncubationMentorController.getStartupMentorUsage);

export default IncubationMentorRouter;
