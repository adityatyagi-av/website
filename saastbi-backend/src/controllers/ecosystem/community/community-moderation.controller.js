import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";
import { CommunityModerationService } from "../../../services/ecosystem/community/community-moderation.service.js";

export const CommunityModerationController = {
  getModerationQueue: asyncHandler(async (req, res) => {
    const result = await CommunityModerationService.getModerationQueue(req.user.id, req.params.communityId, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  reviewReport: asyncHandler(async (req, res) => {
    const result = await CommunityModerationService.reviewReport(req.user.id, req.params.reportId, req.body);
    return apiResponse.sendSuccess(res, result, "Report reviewed successfully");
  }),

  getActivityLog: asyncHandler(async (req, res) => {
    const result = await CommunityModerationService.getActivityLog(req.user.id, req.params.communityId, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  bulkModerate: asyncHandler(async (req, res) => {
    const result = await CommunityModerationService.bulkModerate(
      req.user.id, req.params.communityId, req.body.itemIds, req.body.action, req.body.type
    );
    return apiResponse.sendSuccess(res, result, "Bulk moderation completed");
  }),

  getMemberModerationHistory: asyncHandler(async (req, res) => {
    const result = await CommunityModerationService.getMemberModerationHistory(
      req.user.id, req.params.communityId, req.params.userId
    );
    return apiResponse.sendSuccess(res, result);
  }),
};
