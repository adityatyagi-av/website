import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";
import { JobAlertService } from "../../../services/ecosystem/job/job-alert.service.js";

export const JobAlertController = {
  createAlert: asyncHandler(async (req, res) => {
    const result = await JobAlertService.createAlert(req.user.id, req.body);
    return apiResponse.sendCreated(res, result, "Job alert created");
  }),

  getMyAlerts: asyncHandler(async (req, res) => {
    const result = await JobAlertService.getMyAlerts(req.user.id);
    return apiResponse.sendSuccess(res, result);
  }),

  updateAlert: asyncHandler(async (req, res) => {
    const result = await JobAlertService.updateAlert(req.user.id, req.params.alertId, req.body);
    return apiResponse.sendUpdated(res, result, "Alert updated");
  }),

  deleteAlert: asyncHandler(async (req, res) => {
    const result = await JobAlertService.deleteAlert(req.user.id, req.params.alertId);
    return apiResponse.sendSuccess(res, result);
  }),

  toggleAlert: asyncHandler(async (req, res) => {
    const result = await JobAlertService.toggleAlert(req.user.id, req.params.alertId);
    return apiResponse.sendSuccess(res, result);
  }),
};
