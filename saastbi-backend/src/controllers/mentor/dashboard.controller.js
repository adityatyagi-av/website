import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";
import { DashboardService } from "../../services/mentor/dashboard.service.js";

export const DashboardController = {
  getOverview: asyncHandler(async (req, res) => {
    const overview = await DashboardService.getOverview(req.user.id);
    return apiResponse.sendSuccess(res, overview);
  }),

  getSessionAnalytics: asyncHandler(async (req, res) => {
    const { period } = req.query;
    const analytics = await DashboardService.getSessionAnalytics(req.user.id, period);
    return apiResponse.sendSuccess(res, analytics);
  }),

  getEarningsAnalytics: asyncHandler(async (req, res) => {
    const { period } = req.query;
    const analytics = await DashboardService.getEarningsAnalytics(req.user.id, period);
    return apiResponse.sendSuccess(res, analytics);
  }),

  getReviewAnalytics: asyncHandler(async (req, res) => {
    const analytics = await DashboardService.getReviewAnalytics(req.user.id);
    return apiResponse.sendSuccess(res, analytics);
  }),

  getMenteeAnalytics: asyncHandler(async (req, res) => {
    const analytics = await DashboardService.getMenteeAnalytics(req.user.id);
    return apiResponse.sendSuccess(res, analytics);
  }),
};
