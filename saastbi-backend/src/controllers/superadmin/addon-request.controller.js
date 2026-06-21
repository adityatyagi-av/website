import { SuperAdminAddonRequestService } from "../../services/superadmin/addon-request.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";
import { ApiError } from "../../utils/ApiError.js";

export const SuperAdminAddonRequestController = {
  getAllAddonRequests: asyncHandler(async (req, res) => {
    try {
      const { page, limit, search, status, sortBy, order } = req.query;
      const result = await SuperAdminAddonRequestService.getAllAddonRequests({
        page, limit, search, status, sortBy, order,
      });
      return apiResponse.sendCustomResponse(res, 200, result, "Addon requests fetched successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  getAddonRequestDetails: asyncHandler(async (req, res) => {
    try {
      const { requestId } = req.params;
      const request = await SuperAdminAddonRequestService.getAddonRequestById(requestId);
      return apiResponse.sendCustomResponse(res, 200, request, "Addon request details fetched");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  updateAddonRequestStatus: asyncHandler(async (req, res) => {
    try {
      const { requestId, status, adminNotes } = req.body;
      if (!requestId || !status) {
        return apiResponse.sendBadRequest(res, "requestId and status are required");
      }
      const reviewerId = req.user.id;
      const result = await SuperAdminAddonRequestService.updateAddonRequestStatus(
        requestId, status, reviewerId, adminNotes
      );
      return apiResponse.sendCustomResponse(res, 200, result, "Addon request status updated");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),
};
