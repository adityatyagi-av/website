import { PortalAddonRequestService } from "../../../services/incubation/portal/addon-request.service.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";
import { resolveTenantId } from "../../../utils/tenantResolver.js";

export const AddonRequestController = {
  getAvailableAddons: asyncHandler(async (req, res) => {
    const addons = await PortalAddonRequestService.getAvailableAddons();
    return apiResponse.sendSuccess(res, addons, "Available addons fetched");
  }),

  submitRequest: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const requestedById = req.user.incubationUserId;
    const { addonId, phone, preferredDate, preferredTime, message } = req.body;

    const request = await PortalAddonRequestService.submitAddonRequest({
      tenantId,
      requestedById,
      addonId,
      phone,
      preferredDate,
      preferredTime,
      message,
    });

    return apiResponse.sendCreated(res, request, "Addon request submitted successfully");
  }),

  getMyRequests: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { page, limit, status, sortBy, order } = req.query;
    const result = await PortalAddonRequestService.getMyAddonRequests(tenantId, {
      page, limit, status, sortBy, order,
    });
    return apiResponse.sendSuccess(res, result, "Addon requests fetched");
  }),

  getRequestDetails: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { requestId } = req.params;
    const request = await PortalAddonRequestService.getAddonRequestById(requestId, tenantId);
    return apiResponse.sendSuccess(res, request, "Addon request details fetched");
  }),

  cancelRequest: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { requestId } = req.params;
    const result = await PortalAddonRequestService.cancelAddonRequest(requestId, tenantId);
    return apiResponse.sendSuccess(res, result, "Addon request cancelled");
  }),
};
