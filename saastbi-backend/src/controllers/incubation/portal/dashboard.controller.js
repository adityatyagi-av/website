import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";
import { ApiError } from "../../../utils/ApiError.js";
import { DashboardService } from "../../../services/incubation/portal/dashboard.service.js";
import { resolveTenantId } from "../../../utils/tenantResolver.js";

export const DashboardController = {
  getDashboardMetrics: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    console.log("tenantId", tenantId);

    if (!tenantId) {
      throw new ApiError(400, "tenantId is required");
    }

    const data = await DashboardService.getDashboardMetrics(tenantId);

    return apiResponse.sendSuccess(
      res,
      data,
      "Dashboard metrics fetched successfully"
    );
  }),

  getApplicationsOverTime: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);

    if (!tenantId) {
      throw new ApiError(400, "tenantId is required");
    }

    const data = await DashboardService.getApplicationsOverTime(tenantId);

    return apiResponse.sendSuccess(
      res,
      data,
      "Applications over time fetched"
    );
  }),

  getStartupsByStage: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
  
    if (!tenantId) {
      throw new ApiError(400, "tenantId is required");
    }
  
    const data = await DashboardService.getStartupsByStage(tenantId);
  
    return apiResponse.sendSuccess(
      res,
      data,
      "Startups by stage fetched successfully"
    );
  })
};