import { tenantService } from "../../../services/incubation/portal/tenant.service.js";
import { ApiError } from "../../../utils/ApiError.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";

export const TenantController = {
  getTenantInfoDetails: asyncHandler(async (req, res) => {
    try {
      const tenantKey = req.headers["tenantkey"];
      if (!tenantKey) {
        throw new ApiError(400, "HostName Not Found");
      }
      const tenantDetails = await tenantService.getTenantBasicDetails(
        tenantKey
      );
      return apiResponse.sendSuccess(
        res,
        tenantDetails,
        "Tenant Details Fetched Successfully"
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          null,
          error.message
        );
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  // ─── Full Profile ──────────────────────────────────────────────────────────

  getTenantProfile: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "HostName Not Found");

    const profile = await tenantService.getTenantFullProfile(tenantKey);
    return apiResponse.sendSuccess(res, profile, "Tenant profile fetched successfully");
  }),

  updateTenantProfile: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "HostName Not Found");

    const updated = await tenantService.updateTenantProfile(tenantKey, req.body);
    return apiResponse.sendUpdated(res, updated, "Tenant profile updated successfully");
  }),

  // ─── Section-wise Updates ──────────────────────────────────────────────────

  updateBranding: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "HostName Not Found");

    const updated = await tenantService.updateBranding(tenantKey, req.body);
    return apiResponse.sendUpdated(res, updated, "Branding updated successfully");
  }),

  updateContact: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "HostName Not Found");

    const updated = await tenantService.updateContact(tenantKey, req.body);
    return apiResponse.sendUpdated(res, updated, "Contact info updated successfully");
  }),

  updateSocial: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "HostName Not Found");

    const updated = await tenantService.updateSocial(tenantKey, req.body);
    return apiResponse.sendUpdated(res, updated, "Social links updated successfully");
  }),

  updateClassification: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "HostName Not Found");

    const updated = await tenantService.updateClassification(tenantKey, req.body);
    return apiResponse.sendUpdated(res, updated, "Classification updated successfully");
  }),

  updateInfrastructure: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "HostName Not Found");

    const updated = await tenantService.updateInfrastructure(tenantKey, req.body);
    return apiResponse.sendUpdated(res, updated, "Infrastructure updated successfully");
  }),

  updateOperations: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "HostName Not Found");

    const updated = await tenantService.updateOperations(tenantKey, req.body);
    return apiResponse.sendUpdated(res, updated, "Operations updated successfully");
  }),

  updateFunding: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "HostName Not Found");

    const updated = await tenantService.updateFunding(tenantKey, req.body);
    return apiResponse.sendUpdated(res, updated, "Funding info updated successfully");
  }),

  updatePartnerships: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "HostName Not Found");

    const updated = await tenantService.updatePartnerships(tenantKey, req.body);
    return apiResponse.sendUpdated(res, updated, "Partnerships updated successfully");
  }),

  updateMetrics: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "HostName Not Found");

    const updated = await tenantService.updateMetrics(tenantKey, req.body);
    return apiResponse.sendUpdated(res, updated, "Impact metrics updated successfully");
  }),

  updateRecognition: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "HostName Not Found");

    const updated = await tenantService.updateRecognition(tenantKey, req.body);
    return apiResponse.sendUpdated(res, updated, "Recognition updated successfully");
  }),

  updateSettings: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "HostName Not Found");

    const updated = await tenantService.updateSettings(tenantKey, req.body);
    return apiResponse.sendUpdated(res, updated, "Settings updated successfully");
  }),

  updateContent: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "HostName Not Found");

    const updated = await tenantService.updateContent(tenantKey, req.body);
    return apiResponse.sendUpdated(res, updated, "Content updated successfully");
  }),

  // ─── Computed Metrics Only ─────────────────────────────────────────────────

  getComputedMetrics: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "HostName Not Found");

    const tenant = await tenantService.getTenantBasicDetails(tenantKey);
    // We need tenantId — getTenantBasicDetails doesn't return id, so fetch it
    const tenantWithId = await tenantService.getTenantFullProfile(tenantKey);
    const metrics = await tenantService.computeTenantMetrics(tenantWithId.id);

    return apiResponse.sendSuccess(res, metrics, "Computed metrics fetched successfully");
  }),
};

export const ModuleController = {
  fetchModulesByTenant: asyncHandler(async (req, res) => {
    try {
      const tenantKey = req.headers["tenantkey"];
      if (!tenantKey) {
        throw new ApiError(400, "HostName Not Found");
      }
      const modules = await tenantService.getModulesByTenantPlan(tenantKey);
      return apiResponse.sendSuccess(
        res,
        modules,
        "Modules fetched successfully for tenant plan"
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          null,
          error.message
        );
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),
};
