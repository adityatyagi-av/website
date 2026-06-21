import { Router } from "express";
import { TenantStartupController } from "../../../controllers/incubation/portal/startup.controller.js";
import { StartupDetailController } from "../../../controllers/incubation/portal/startup-detail.controller.js";
import { authenticatePortal } from "../../../middlewares/portal.auth.middleware.js";
import { requireAccessByMethod } from "../../../middlewares/access.middleware.js";
import { MODULE_KEYS } from "../../../config/modules.registry.js";

const TenantStartupRouter = Router();

TenantStartupRouter.use("/startups", authenticatePortal, requireAccessByMethod(MODULE_KEYS.STARTUP_MANAGEMENT));

// Existing endpoints
TenantStartupRouter.get("/startups/list", TenantStartupController.getStartups);
TenantStartupRouter.get("/startups/get-startup/:startupId", TenantStartupController.getStartupDetails);

// Individual startup detail endpoints
TenantStartupRouter.get("/startups/:startupId/overview", StartupDetailController.getStartupOverview);
TenantStartupRouter.get("/startups/:startupId/funding", StartupDetailController.getStartupFunding);
TenantStartupRouter.post("/startups/:startupId/funding/disburse", StartupDetailController.disburseToStartup);
TenantStartupRouter.get("/startups/:startupId/registration/:applicationId", StartupDetailController.getRegistrationDetail);
TenantStartupRouter.get("/startups/:startupId/evaluations", StartupDetailController.getStartupEvaluations);
TenantStartupRouter.get("/startups/:startupId/office-allocations", StartupDetailController.getStartupOfficeAllocations);
TenantStartupRouter.get("/startups/:startupId/facility-bookings", StartupDetailController.getStartupFacilityBookings);
TenantStartupRouter.get("/startups/:startupId/mentorships", StartupDetailController.getStartupMentorships);
TenantStartupRouter.get("/startups/:startupId/associations", StartupDetailController.getStartupAssociations);

export default TenantStartupRouter;
