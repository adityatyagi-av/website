import { facilityService } from "../../services/incubation/portal/portal-facility.service.js";
import { StartupFacilityService } from "../../services/startup/startup-facility.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";
import db from "../../db/db.js";

export const StartupFacilityController = {
  getStartupTenants: asyncHandler(async (req, res) => {
    const { startupId } = req.params;
    const result = await StartupFacilityService.getStartupTenants({
      startupId
    });
  
    return apiResponse.sendSuccess(
      res,
      result,
      "Startup tenants fetched successfully"
    );
  }),

  listFacilities: asyncHandler(async (req, res) => {
    const { startupId } = req.params;
    const {
      selectedTenant="all",
      page = 1,
      limit = 10,
      search = "",
      status,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;
    const result = await StartupFacilityService.getFacilities({
      startupId,
      selectedTenant,
      page: Number(page),
      limit: Number(limit),
      search,
      status,
      sortBy,
      order,
    });
    return apiResponse.sendSuccess(res, result, "Facilities fetched");
  }),

  getFacilityDetailForStartup: asyncHandler(async (req, res) => {
    const { tenantId, facilityId } = req.params;
    const startupUserId = req.user.id;

    const startupId = req.user.startupId;
    console.log(startupUserId, startupId);
    const result = await StartupFacilityService.getFacilityById({
      tenantId,
      facilityId,
    });
    return apiResponse.sendSuccess(res, result, "Facility detail");
  }),

  checkAvailability: asyncHandler(async (req, res) => {
    const { tenantId, facilityId, date } = req.params;
    const result = await StartupFacilityService.getSlotsForDate({
      tenantId,
      facilityId,
      date,
    });
    return apiResponse.sendSuccess(res, result, "Availability fetched");
  }),

  requestMultiSlotBooking: asyncHandler(async (req, res) => {
    const { tenantId, facilityId } = req.params;
    const startupUserId = req.user.userId;


    const { timeslotIds, date, units = 1, reason } = req.body;

    const startupMember = await db.startupMember.findFirst({
      where: {
        userId: startupUserId,
        isActive: true,
      },
      select: {
        startupId: true,
      },
    });
  
    if (!startupMember) {
      throw new ApiError(404, "Startup membership not found");
    }

    const created = await StartupFacilityService.requestMultipleSlots({
      tenantId,
      facilityId,
      timeslotIds,
      date,
      units,
      reason,
      startupId: startupMember.startupId,
      startupUserId,
    });
    return apiResponse.sendSuccess(res, created, "Booking requests submitted");
  }),

  getUpcomingBookings: asyncHandler(async (req, res) => {
    const startupId = req.query.startupId || req.user.startupId;
    console.log("STARTUP ID IS ",startupId)
    const { tenantId } = req.params;

    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      sortBy = "date",
      order = "asc",
    } = req.query;

    const result = await StartupFacilityService.getUpcomingBookings({
      startupId,
      tenantId,
      page,
      limit,
      search,
      status,
      sortBy,
      order,
    });

    return apiResponse.sendSuccess(res, result, "Upcoming bookings fetched");
  }),

  getFacilityRequests: asyncHandler(async (req, res) => {
    const startupId = req.user.startupId;
    const { tenantId } = req.params;

    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const result = await StartupFacilityService.getFacilityRequests({
      startupId,
      tenantId,
      page,
      limit,
      search,
      status,
      sortBy,
      order,
    });

    return apiResponse.sendSuccess(res, result, "Facility requests fetched");
  }),

  getPastBookings: asyncHandler(async (req, res) => {
    const startupId = req.query.startupId || req.user.startupId;
    const { tenantId } = req.params;

    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      sortBy = "date",
      order = "desc",
    } = req.query;

    const result = await StartupFacilityService.getPastBookings({
      startupId,
      tenantId,
      page,
      limit,
      search,
      status,
      sortBy,
      order,
    });

    return apiResponse.sendSuccess(res, result, "Past bookings fetched");
  }),
};
