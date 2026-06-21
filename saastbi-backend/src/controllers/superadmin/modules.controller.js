import { SuperAdminModuleServices } from "../../services/superadmin/module.service.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";

const parseBoolFlag = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  const normalized = String(value).toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return undefined;
};

export const SuperAdminModuleController = {
  getModules: asyncHandler(async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        searchFields = [],
        isCore,
        isActive,
        category,
      } = req.query;

      const result = await SuperAdminModuleServices.getModules({
        page,
        limit,
        search,
        searchFields,
        isCore: parseBoolFlag(isCore),
        isActive: parseBoolFlag(isActive),
        category,
      });

      return apiResponse.sendCustomResponse(res, 200, result);
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

  getModuleDropdown: asyncHandler(async (req, res) => {
    try {
      const excludeCore = parseBoolFlag(req.query.excludeCore) === true;
      const modules = await SuperAdminModuleServices.getModuleDropdown({
        excludeCore,
      });
      return apiResponse.sendCustomResponse(res, 200, modules);
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

  getModulesForPlan: asyncHandler(async (req, res) => {
    try {
      const data = await SuperAdminModuleServices.getModulesForPlan();
      return apiResponse.sendCustomResponse(
        res,
        200,
        data,
        "Plan-attachable modules fetched successfully"
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

  createPlan: asyncHandler(async (req, res) => {
    const {
      name,
      price,
      type,
      moduleIds,
      maxUsers,
      maxStartups,
      storageLimit,
      features,
    } = req.body;

    const plan = await SuperAdminModuleServices.createPlan({
      name,
      price,
      type,
      moduleIds,
      maxUsers,
      maxStartups,
      storageLimit,
      features,
    });

    return apiResponse.sendCustomResponse(
      res,
      201,
      plan,
      "Plan created successfully with modules and limits"
    );
  }),

  getPlans: asyncHandler(async (req, res) => {
    try {
      const plans = await SuperAdminModuleServices.getPlans();
      return apiResponse.sendCustomResponse(
        res,
        200,
        plans,
        "Plans fetched successfully"
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

  getPlansByType: asyncHandler(async (req, res) => {
    try {
      const plans = await SuperAdminModuleServices.getPlansByType();
      return apiResponse.sendCustomResponse(
        res,
        200,
        plans,
        "Plans fetched and grouped by type successfully"
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

  updatePlanModules: asyncHandler(async (req, res) => {
    try {
      const { planId, moduleIds } = req.body;
      const updatedPlan = await SuperAdminModuleServices.updatePlanModules({
        planId,
        moduleIds,
      });
      return apiResponse.sendCustomResponse(
        res,
        200,
        updatedPlan,
        "Plan modules updated successfully"
      );
    } catch (error) {
      if (error instanceof ApiError)
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          null,
          error.message
        );
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  updatePlanDetails: asyncHandler(async (req, res) => {
    try {
      const {
        planId,
        name,
        maxUsers,
        maxStartups,
        storageLimit,
        featuresInArray,
      } = req.body;

      const updatedPlan = await SuperAdminModuleServices.updatePlanDetails({
        planId,
        name,
        maxUsers,
        maxStartups,
        storageLimit,
        featuresInArray,
      });

      return apiResponse.sendCustomResponse(
        res,
        200,
        updatedPlan,
        "Plan details updated successfully"
      );
    } catch (error) {
      if (error instanceof ApiError)
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          null,
          error.message
        );
      return apiResponse.sendServerError(res, error.message);
    }
  }),
};
