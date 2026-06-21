import { programService } from "../../../services/incubation/portal/program.service.js";
import { tenantStartupService } from "../../../services/incubation/portal/startup.service.js";
import { ApiError } from "../../../utils/ApiError.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";

export const TenantStartupController = {
  getStartups: asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      order = "desc",
      stage,
      status,
    } = req.query;

    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;
    if (!tenantKey)
      throw new ApiError(400, "tenantKey is required (headers or body)");

    const result = await tenantStartupService.getStartups({
      tenantKey,
      page: Number(page),
      limit: Number(limit),
      search,
      sortBy,
      order,
      stage,
      status,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Startups fetched successfully"
    );
  }),

  getStartupDetails: asyncHandler(async (req, res) => {
    const { startupId } = req.params;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;
    if (!tenantKey)
      throw new ApiError(400, "tenantKey is required (headers or body)");

    const result = await tenantStartupService.getStartupDetails({
      tenantKey,
      startupId,
    });
    return apiResponse.sendSuccess(
      res,
      result,
      "Startup details fetched successfully"
    );
  }),
};