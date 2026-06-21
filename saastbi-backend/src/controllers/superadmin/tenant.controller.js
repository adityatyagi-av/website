import { TenantService } from "../../services/superadmin/tenant.service.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";

export const SuperAdminTenantController = {
  getAllTenants: asyncHandler(async (req, res) => {
    try {
      const { page, limit, search, sortBy, order } = req.query;
      const result = await TenantService.getAllTenants({
        page, limit, search, sortBy, order,
      });
      return apiResponse.sendCustomResponse(res, 200, result, "Tenants fetched successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  getTenantById: asyncHandler(async (req, res) => {
    try {
      const { tenantId } = req.params;
      if (!tenantId) {
        return apiResponse.sendBadRequest(res, "Tenant ID is required");
      }
      const tenant = await TenantService.getTenantById(tenantId);
      return apiResponse.sendCustomResponse(res, 200, tenant, "Tenant fetched successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  getTenantInvoices: asyncHandler(async (req, res) => {
    try {
      const { tenantId } = req.params;
      const { page, limit, status } = req.query;
      if (!tenantId) {
        return apiResponse.sendBadRequest(res, "Tenant ID is required");
      }
      const result = await TenantService.getTenantInvoices(tenantId, { page, limit, status });
      return apiResponse.sendCustomResponse(res, 200, result, "Tenant invoices fetched successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),
};
