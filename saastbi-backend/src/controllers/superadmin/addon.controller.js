import { AddonService } from "../../services/superadmin/addon.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";
import { ApiError } from "../../utils/ApiError.js";

export const AddonController = {
  createAddon: asyncHandler(async (req, res) => {
    try {
      console.log("HIT")
      const { addonKey, name, description, type, price, unit, estimatedPrice, icon } = req.body;
      const addon = await AddonService.createAddon({
        addonKey, name, description, type, price, unit, estimatedPrice, icon,
      });
      return apiResponse.sendCustomResponse(res, 201, addon, "Addon created successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  getAllAddons: asyncHandler(async (req, res) => {
    try {
      const { page, limit, search, sortBy, order } = req.query;
      const result = await AddonService.getAllAddons({ page, limit, search, sortBy, order });
      return apiResponse.sendCustomResponse(res, 200, result, "Addons fetched successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  getAddonById: asyncHandler(async (req, res) => {
    try {
      const { addonId } = req.params;
      const addon = await AddonService.getAddonById(addonId);
      return apiResponse.sendCustomResponse(res, 200, addon, "Addon fetched successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  updateAddon: asyncHandler(async (req, res) => {
    try {
      const { addonId, ...updateData } = req.body;
      if (!addonId) {
        return apiResponse.sendBadRequest(res, "addonId is required");
      }
      const addon = await AddonService.updateAddon(addonId, updateData);
      return apiResponse.sendCustomResponse(res, 200, addon, "Addon updated successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  toggleAddonStatus: asyncHandler(async (req, res) => {
    try {
      const { addonId, isActive } = req.body;
      if (!addonId || isActive === undefined) {
        return apiResponse.sendBadRequest(res, "addonId and isActive are required");
      }
      const addon = await AddonService.toggleAddonStatus(addonId, isActive);
      return apiResponse.sendCustomResponse(res, 200, addon, "Addon status updated successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  deleteAddon: asyncHandler(async (req, res) => {
    try {
      const { addonId } = req.params;
      const result = await AddonService.deleteAddon(addonId);
      return apiResponse.sendCustomResponse(res, 200, result, "Addon deleted successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),
};
