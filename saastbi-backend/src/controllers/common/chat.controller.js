import { chatService } from "../../services/common/chat.services.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";
import { resolveTenantId } from "../../utils/tenantResolver.js";

function isSuperAdminUser(user) {
  return typeof user.role === "string";
}

export const SuperAdminChatController = {
  getAllChats: asyncHandler(async (req, res) => {
    try {
      if (!isSuperAdminUser(req.user)) {
        return apiResponse.sendForbidden(res, "Only super admins can access all chats");
      }
      const { page = 1, limit = 20, search = "" } = req.query;
      const result = await chatService.getAllChats({
        page: parseInt(page),
        limit: parseInt(limit),
        search,
      });
      return apiResponse.sendSuccess(res, result, "All chats fetched successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  searchTenantAdmins: asyncHandler(async (req, res) => {
    try {
      if (!isSuperAdminUser(req.user)) {
        return apiResponse.sendForbidden(res, "Only super admins can search tenant admins");
      }
      const { search, page = 1, limit = 20 } = req.query;
      if (!search) {
        return apiResponse.sendBadRequest(res, "Search query is required");
      }
      const result = await chatService.searchTenantAdmins({
        search,
        page: parseInt(page),
        limit: parseInt(limit),
      });
      return apiResponse.sendSuccess(res, result, "Tenant admins fetched successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  getChatHistory: asyncHandler(async (req, res) => {
    try {
      if (!isSuperAdminUser(req.user)) {
        return apiResponse.sendForbidden(res, "Only super admins can access this endpoint");
      }
      const { tenantId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const result = await chatService.getChatHistory({
        tenantId,
        page: parseInt(page),
        limit: parseInt(limit),
      });
      return apiResponse.sendSuccess(res, result, "Chat history fetched successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),
};

export const PortalChatController = {
  getMyChat: asyncHandler(async (req, res) => {
    try {
      const tenantId = await resolveTenantId(req);
      const chat = await chatService.getTenantChat(tenantId);
      return apiResponse.sendSuccess(
        res,
        { chat },
        chat ? "Chat fetched successfully" : "No chat found"
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  getChatHistory: asyncHandler(async (req, res) => {
    try {
      console.log("THIS IS USER",req.user)
      const tenantId = await resolveTenantId(req);
      const { page = 1, limit = 50 } = req.query;
      const result = await chatService.getChatHistory({
        tenantId,
        page: parseInt(page),
        limit: parseInt(limit),
      });
      return apiResponse.sendSuccess(res, result, "Chat history fetched successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  markAsRead: asyncHandler(async (req, res) => {
    try {
      
      const tenantId = await resolveTenantId(req);
      await chatService.markTenantMessagesAsRead(tenantId, req.user.id);
      return apiResponse.sendSuccess(res, null, "Messages marked as read");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),
};
