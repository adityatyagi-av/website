import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";
import { TenantModuleOverrideService } from "../../services/superadmin/tenant-module-override.service.js";

export const TenantModuleOverrideController = {
  create: asyncHandler(async (req, res) => {
    const { tenantId } = req.params;
    const { moduleId, grantType, reason, startsAt, expiresAt } = req.body;
    const grantedBy = req.user?.id || req.user?.userId || null;
    const result = await TenantModuleOverrideService.create({
      tenantId, moduleId, grantType, reason, grantedBy, startsAt, expiresAt,
    });
    return apiResponse.sendCreated(res, result, "Module override saved");
  }),

  list: asyncHandler(async (req, res) => {
    const { tenantId } = req.params;
    const result = await TenantModuleOverrideService.list({ tenantId });
    return apiResponse.sendSuccess(res, result, "Overrides fetched");
  }),

  update: asyncHandler(async (req, res) => {
    const { tenantId, overrideId } = req.params;
    const result = await TenantModuleOverrideService.update({
      tenantId,
      overrideId,
      data: req.body,
    });
    return apiResponse.sendUpdated(res, result, "Override updated");
  }),

  remove: asyncHandler(async (req, res) => {
    const { tenantId, overrideId } = req.params;
    const result = await TenantModuleOverrideService.remove({ tenantId, overrideId });
    return apiResponse.sendDeleted(res, result, "Override deleted");
  }),
};
