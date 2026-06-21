import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";
import { ApiError } from "../../utils/ApiError.js";
import { StartupDashboardService } from "../../services/startup/dashboard.service.js";

export const startupDashboardController = {
  getDashboardMetrics: asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const { startupId } = req.params;

    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    if (!startupId) {
      throw new ApiError(400, "startupId is required");
    }

    const result = await StartupDashboardService.getMetrics({userId,startupId});

    return apiResponse.sendSuccess(
      res,
      result,
      "Dashboard metrics fetched successfully"
    );
  }),
};