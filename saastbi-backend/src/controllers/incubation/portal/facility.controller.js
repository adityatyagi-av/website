import { facilityService } from "../../../services/incubation/portal/portal-facility.service.js";
import { StartupFacilityService } from "../../../services/startup/startup-facility.service.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";
import { resolveTenantId } from "../../../utils/tenantResolver.js";
export const FacilityController = {
  createFacility: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const payload = req.body;
    const facility = await facilityService.createFacility({
      tenantId,
      data: payload,
    });
    return apiResponse.sendSuccess(res, facility, "Facility created");
  }),

  getFacilities: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;
    const result = await facilityService.getFacilities({
      tenantId,
      page: Number(page),
      limit: Number(limit),
      search,
      status,
      sortBy,
      order,
    });
    return apiResponse.sendSuccess(res, result, "Facilities fetched");
  }),

  getFacilityById: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { facilityId } = req.params;
    const result = await facilityService.getFacilityById({
      tenantId,
      facilityId,
      lastBookings: Number(req.query.lastBookings) || 5,
    });
    return apiResponse.sendSuccess(res, result, "Facility details");
  }),

  updateFacility: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { facilityId } = req.params;
    const result = await facilityService.updateFacility({
      tenantId,
      facilityId,
      data: req.body,
    });
    return apiResponse.sendSuccess(res, result, "Facility updated");
  }),

  deleteFacility: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { facilityId } = req.params;
    const result = await facilityService.deleteFacility({
      tenantId,
      facilityId,
    });
    return apiResponse.sendSuccess(res, result, "Facility archived");
  }),

  checkAvailability: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);

    const { facilityId, date } = req.params;
    const result = await StartupFacilityService.getSlotsForDate({
      tenantId,
      facilityId,
      date,
    });
    return apiResponse.sendSuccess(res, result, "Availability fetched");
  }),

  getFacilityReportsOverview: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const result = await facilityService.getOverviewReport({
        tenantId,
      });
    return apiResponse.sendSuccess(
      res,
      result,
      "Facility reports fetched successfully"
    );
  }),

  // bookings
  listBookings: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const {
      page = 1,
      limit = 20,
      status,
      date,
      facilityId,
      startupId,
      search = "",
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const result = await facilityService.listBookings({
      tenantId,
      page: Number(page),
      limit: Number(limit),
      status,
      date,
      facilityId,
      startupId,
      search,
      sortBy,
      order,
    });
    return apiResponse.sendSuccess(res, result, "Bookings listed");
  }),

  getBooking: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { bookingId } = req.params;
    const booking = await facilityService.getBooking({ tenantId, bookingId });
    return apiResponse.sendSuccess(res, booking, "Booking fetched");
  }),

  approveBooking: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const incubationUserId = req.user.incubationUserId;
    const { bookingId } = req.params;
    const { comment } = req.body;
    const updated = await facilityService.approveBooking({
      tenantId,
      bookingId,
      incubationUserId,
      comment,
    });
    return apiResponse.sendSuccess(res, updated, "Booking approved");
  }),

  rejectBooking: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { bookingId } = req.params;
    const { reason } = req.body;
    const incubationUserId=req.user.incubationUserId
    const updated = await facilityService.rejectBooking({
      tenantId,
      bookingId,
      incubationUserId,
      reason
    });
    return apiResponse.sendSuccess(res, updated, "Booking rejected");
  }),

  cancelBooking: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { bookingId } = req.params;
    const incubationUserId = req.user.incubationUserId;
    const updated = await facilityService.cancelBooking({
      tenantId,
      bookingId,
      incubationUserId,
      byAdmin: true,
    });
    return apiResponse.sendSuccess(res, updated, "Booking canceled");
  }),

  rescheduleBooking: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { bookingId } = req.params;
    const { date, timeslotId } = req.body;
    const incubationUserId = req.user.incubationUserId;


    const updated = await facilityService.rescheduleBooking({
      tenantId,
      bookingId,
      incubationUserId,
      date,
      timeslotId,
      byAdmin: true,
    });

    return apiResponse.sendSuccess(res, updated, "Booking rescheduled");
  }),

  listBookingsForStartup: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { startupId } = req.params;
    const {
      page = 1,
      limit = 20,
      search = "",

      status,
      sortBy = "date",
      order = "desc",
    } = req.query;
    const result = await facilityService.listBookingsForStartup({
      tenantId,
      startupId,
      page: Number(page),
      limit: Number(limit),
      search,
      status,
      sortBy,
      order,
    });
    return apiResponse.sendSuccess(res, result, "Bookings for startup fetched");
  }),

  // calendar / availability
  getFacilityCalendar: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { facilityId } = req.params;
    const { month, unitIndex = null, showUnits = "false" } = req.query;
    const result = await facilityService.getFacilityCalendar({
      tenantId,
      facilityId,
      month,
      unitIndex,
      showUnits: showUnits === "true",
    });
    return apiResponse.sendSuccess(res, result, "Calendar fetched");
  }),

  getTenantCalendar: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { from, to } = req.query;
    const result = await facilityService.getTenantCalendar({
      tenantId,
      from,
      to,
    });
    return apiResponse.sendSuccess(res, result, "Tenant calendar fetched");
  }),

  getFacilityUsage: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { facilityId } = req.params;
    const { from, to } = req.query;
    const result = await facilityService.getFacilityUsage({
      tenantId,
      facilityId,
      from,
      to,
    });
    return apiResponse.sendSuccess(res, result, "Facility usage");
  }),
};
