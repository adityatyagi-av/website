import { apiResponse } from "../../utils/responseUtils.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { startupOfficeService } from "../../services/startup/startup-office-space.service.js";

export const startupOfficeController = {

  requestOffice: asyncHandler(async (req, res) => {
    const startupUserId = req.user.id;
    const startupId = req.user.startupId;
    const tenantId = req.body.tenantId;
    const tenantKey = req.body.tenantKey;

    if (!tenantId && !tenantKey) {
      throw new ApiError(400, "tenantId or tenantKey is required in body");
    }

    const data = req.body;

    const result = await startupOfficeService.requestOffice({
      startupUserId,
      startupId,
      tenantId,
      tenantKey,
      data,
    });

    return apiResponse.sendSuccess(res, result, "Office request submitted");
  }),

  getMyRequests: asyncHandler(async (req, res) => {
    const startupId = req.user.startupId;

    const result = await startupOfficeService.getStartupRequests({ startupId });

    return apiResponse.sendSuccess(res, result, "Requests fetched");
  }),

  getMyOffice: asyncHandler(async (req, res) => {
    const startupId = req.user.startupId;

    const result = await startupOfficeService.getMyOffice({ startupId });

    return apiResponse.sendSuccess(res, result, "My office data fetched");
  }),

  getMyOfficeHistory: asyncHandler(async (req, res) => {
    const startupId = req.user.startupId;

    const result = await startupOfficeService.getMyOfficeHistory({
      startupId,
    });

    return apiResponse.sendSuccess(res, result, "History fetched");
  }),

  getOfficeAvailability: asyncHandler(async (req, res) => {
    const { officeId } = req.params;

    const result = await startupOfficeService.getOfficeAvailability({
      officeId,
    });

    return apiResponse.sendSuccess(res, result, "Availability fetched");
  }),
};

