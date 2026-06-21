import { roleService } from "../../../services/incubation/portal/roles.service.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";

export const RoleController = {
  createRole: asyncHandler(async (req, res) => {
    const {  roleName, modulePermissions } = req.body;
        const tenantKey = req.headers["tenantkey"];

    const role = await roleService.createRole({ tenantKey, roleName, modulePermissions });
    return apiResponse.sendSuccess(res, role, "Role created successfully");
  }),

  updateRole: asyncHandler(async (req, res) => {
    const {  roleName, modulePermissions } = req.body;
        const tenantKey = req.headers["tenantkey"];

    const { roleId } = req.params;
    const role = await roleService.updateRole({ tenantKey, roleId, roleName, modulePermissions });
    return apiResponse.sendUpdated(res, role, "Role updated successfully");
  }),

  getRoles: asyncHandler(async (req, res) => {
    const {  page, limit, search, sortBy, order } = req.query;
        const tenantKey = req.headers["tenantkey"];

    const roles = await roleService.getRoles({ tenantKey, page, limit, search, sortBy, order });
    return apiResponse.sendSuccess(res, roles, "Roles fetched successfully");
  }),

  getRolesDropdown: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    const roles = await roleService.getRolesDropdown({ tenantKey });
    return apiResponse.sendSuccess(res, roles, "Roles dropdown fetched successfully");
  }),

  getAvailableModules: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"] || req.query.tenantKey;
    const modules = await roleService.getAvailableModules({ tenantKey });
    return apiResponse.sendSuccess(res, modules, "Available modules fetched");
  }),
};
