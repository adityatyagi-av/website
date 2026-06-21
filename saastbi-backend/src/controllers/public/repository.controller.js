import { publicRepositoryService } from "../../services/incubation/portal/public-repository.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";

export const PublicApiController = {
  getRepositoryData: asyncHandler(async (req, res) => {
    const { apiKey } = req.params;
    const { page, limit } = req.query;
    const ipAddress = req.headers["x-forwarded-for"] || req.socket?.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const result = await publicRepositoryService.getPublicData({
      apiKey,
      pagination: { page: Number(page) || 1, limit: Number(limit) || 100 },
      ipAddress,
      userAgent,
    });

    return apiResponse.sendSuccess(res, result, "Repository data fetched");
  }),

  getRepositorySchema: asyncHandler(async (req, res) => {
    const { apiKey } = req.params;
    const result = await publicRepositoryService.getPublicSchema({ apiKey });
    return apiResponse.sendSuccess(res, result, "Repository schema fetched");
  }),

  getRepositoryItem: asyncHandler(async (req, res) => {
    const { apiKey, itemId } = req.params;
    const result = await publicRepositoryService.getPublicItem({ apiKey, itemId });
    return apiResponse.sendSuccess(res, result, "Item fetched");
  }),
};
