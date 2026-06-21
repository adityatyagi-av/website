import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { StartupFacilityController } from "../../controllers/startup/startup-facility.controller.js";

const StartupFacilityRouter = Router();
StartupFacilityRouter.use(authenticate);

StartupFacilityRouter.get(
  "/facility/startup/:startupId/tenants",
  StartupFacilityController.getStartupTenants
);

StartupFacilityRouter.get(
  "/facility/get-all-facility-for-tenant/:startupId",
  StartupFacilityController.listFacilities
);
StartupFacilityRouter.get(
  "/facility/get-facility/:tenantId/:facilityId",
  StartupFacilityController.getFacilityDetailForStartup
);

StartupFacilityRouter.get(
  "/facility/get-facility-availability/:tenantId/:facilityId/:date",
  StartupFacilityController.checkAvailability
);

StartupFacilityRouter.post(
  "/facility/request-facility-booking/:tenantId/:facilityId",
  StartupFacilityController.requestMultiSlotBooking
);

StartupFacilityRouter.get(
  "/facility/requested-facilities/:tenantId",
  StartupFacilityController.getFacilityRequests
);

StartupFacilityRouter.get(
  "/facility/upcoming-facility-bookings/:tenantId/",
  StartupFacilityController.getUpcomingBookings
);

StartupFacilityRouter.get(
  "/facility/past-facility-bookings/:tenantId/",
  StartupFacilityController.getPastBookings
);

export { StartupFacilityRouter };
