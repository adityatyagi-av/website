import { Router } from "express";
import { authenticatePortal } from "../../../middlewares/portal.auth.middleware.js";
import { requireAccessByMethod } from "../../../middlewares/access.middleware.js";
import { MODULE_KEYS } from "../../../config/modules.registry.js";
import { FacilityController } from "../../../controllers/incubation/portal/facility.controller.js";

const PortalFacilityRouter = Router();
PortalFacilityRouter.use(["/facility", "/facility-booking", "/facility-calendar"], authenticatePortal, requireAccessByMethod(MODULE_KEYS.FACILITY));

PortalFacilityRouter.post(
  "/facility/create",
  FacilityController.createFacility
);
PortalFacilityRouter.get(
  "/facility/get-all-facilities",
  FacilityController.getFacilities
);
PortalFacilityRouter.get(
  "/facility/get-facility/:facilityId",
  FacilityController.getFacilityById
);
PortalFacilityRouter.put(
  "/facility/update-facility/:facilityId",
  FacilityController.updateFacility
);
PortalFacilityRouter.delete(
  "/facility/delete-facility/:facilityId",
  FacilityController.deleteFacility
);
PortalFacilityRouter.get(
  "/facility/get-facility-availability/:facilityId/:date",
  FacilityController.checkAvailability
);
PortalFacilityRouter.get(
  "/facility/reports/overview",
  FacilityController.getFacilityReportsOverview
);

// bookings (admin)
// total api's required : 1. get all booking , 2. individual booking detail,  3. accept booking , 4. reject booking ,5. cancel booking ,6. reschedule booking 7. booking for a particular startup


PortalFacilityRouter.get(
  "/facility-booking/bookings",
  FacilityController.listBookings
);

PortalFacilityRouter.get(
  "/facility-booking/individual-booking/:bookingId",
  FacilityController.getBooking
);
PortalFacilityRouter.post(
  "/facility-booking/booking/:bookingId/approve",
  FacilityController.approveBooking
);
PortalFacilityRouter.post(
  "/facility-booking/booking/:bookingId/reject",
  FacilityController.rejectBooking
);
PortalFacilityRouter.post(
  "/facility-booking/booking/:bookingId/cancel",
  FacilityController.cancelBooking
);
PortalFacilityRouter.post(
  "/facility-booking/booking/:bookingId/reschedule",
  FacilityController.rescheduleBooking
);
PortalFacilityRouter.get(
  "/facility-booking/startup/:startupId/bookings",
  FacilityController.listBookingsForStartup
);

// calendar & stats// will work on it after booking

PortalFacilityRouter.get(
  "/facility-calendar/:facilityId/calendar",
  FacilityController.getFacilityCalendar
);
PortalFacilityRouter.get(
  "/facility-calendar/calendar",
  FacilityController.getTenantCalendar
);
PortalFacilityRouter.get(
  "/facility-calendar/:facilityId/usage",
  FacilityController.getFacilityUsage
);

export { PortalFacilityRouter };
