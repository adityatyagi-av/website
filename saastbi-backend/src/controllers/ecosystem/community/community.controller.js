import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";
import { CommunityManagementService } from "../../../services/ecosystem/community/community-management.service.js";
import { CommunityAnalyticsService } from "../../../services/ecosystem/community/community-analytics.service.js";

export const CommunityController = {
  createCommunity: asyncHandler(async (req, res) => {
    const result = await CommunityManagementService.createCommunity(req.user.id, req.body);
    return apiResponse.sendCreated(res, result, "Community created successfully");
  }),

  updateCommunity: asyncHandler(async (req, res) => {
    const result = await CommunityManagementService.updateCommunity(req.user.id, req.params.communityId, req.body);
    return apiResponse.sendUpdated(res, result, "Community updated successfully");
  }),

  getCommunityBySlug: asyncHandler(async (req, res) => {
    const viewerId = req.user?.id || null;
    const result = await CommunityManagementService.getCommunityBySlug(req.params.slug, viewerId);
    return apiResponse.sendSuccess(res, result);
  }),

  deleteCommunity: asyncHandler(async (req, res) => {
    const result = await CommunityManagementService.deleteCommunity(req.user.id, req.params.communityId);
    return apiResponse.sendDeleted(res, result, "Community deleted successfully");
  }),

  transferOwnership: asyncHandler(async (req, res) => {
    const result = await CommunityManagementService.transferOwnership(req.user.id, req.params.communityId, req.body.newOwnerId);
    return apiResponse.sendSuccess(res, result, "Ownership transferred successfully");
  }),

  updateSettings: asyncHandler(async (req, res) => {
    const result = await CommunityManagementService.updateSettings(req.user.id, req.params.communityId, req.body);
    return apiResponse.sendUpdated(res, result, "Settings updated successfully");
  }),

  addChannel: asyncHandler(async (req, res) => {
    const result = await CommunityManagementService.addChannel(req.user.id, req.params.communityId, req.body);
    return apiResponse.sendCreated(res, result, "Channel created successfully");
  }),

  updateChannel: asyncHandler(async (req, res) => {
    const result = await CommunityManagementService.updateChannel(req.user.id, req.params.channelId, req.body);
    return apiResponse.sendUpdated(res, result, "Channel updated successfully");
  }),

  deleteChannel: asyncHandler(async (req, res) => {
    const result = await CommunityManagementService.deleteChannel(req.user.id, req.params.channelId);
    return apiResponse.sendDeleted(res, result, "Channel deleted successfully");
  }),

  reorderChannels: asyncHandler(async (req, res) => {
    const result = await CommunityManagementService.reorderChannels(req.user.id, req.params.communityId, req.body.orderedIds);
    return apiResponse.sendSuccess(res, result, "Channels reordered successfully");
  }),

  addRule: asyncHandler(async (req, res) => {
    const result = await CommunityManagementService.addRule(req.user.id, req.params.communityId, req.body);
    return apiResponse.sendCreated(res, result, "Rule added successfully");
  }),

  updateRule: asyncHandler(async (req, res) => {
    const result = await CommunityManagementService.updateRule(req.user.id, req.params.ruleId, req.body);
    return apiResponse.sendUpdated(res, result, "Rule updated successfully");
  }),

  deleteRule: asyncHandler(async (req, res) => {
    const result = await CommunityManagementService.deleteRule(req.user.id, req.params.ruleId);
    return apiResponse.sendDeleted(res, result, "Rule deleted successfully");
  }),

  reorderRules: asyncHandler(async (req, res) => {
    const result = await CommunityManagementService.reorderRules(req.user.id, req.params.communityId, req.body.orderedIds);
    return apiResponse.sendSuccess(res, result, "Rules reordered successfully");
  }),

  getAnalytics: asyncHandler(async (req, res) => {
    const result = await CommunityAnalyticsService.getCommunityOverview(req.user.id, req.params.communityId);
    return apiResponse.sendSuccess(res, result);
  }),

  getMemberGrowth: asyncHandler(async (req, res) => {
    const result = await CommunityAnalyticsService.getMemberGrowthChart(req.user.id, req.params.communityId, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  getEngagementMetrics: asyncHandler(async (req, res) => {
    const result = await CommunityAnalyticsService.getEngagementMetrics(req.user.id, req.params.communityId);
    return apiResponse.sendSuccess(res, result);
  }),

  getTopContributors: asyncHandler(async (req, res) => {
    const result = await CommunityAnalyticsService.getTopContributors(req.user.id, req.params.communityId, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  getContentBreakdown: asyncHandler(async (req, res) => {
    const result = await CommunityAnalyticsService.getContentBreakdown(req.user.id, req.params.communityId);
    return apiResponse.sendSuccess(res, result);
  }),

  getMemberRetention: asyncHandler(async (req, res) => {
    const result = await CommunityAnalyticsService.getMemberRetention(req.user.id, req.params.communityId);
    return apiResponse.sendSuccess(res, result);
  }),
  
  getMembershipRules: asyncHandler(async (req, res) => {
    const result = await CommunityManagementService.getMembershipRules(req.user.id, req.params.communityId);
    return apiResponse.sendSuccess(res, result, "Membership settings fetched successfully");
  }),

  updateMembershipRules: asyncHandler(async (req, res) => {
    const result = await CommunityManagementService.updateMembershipRules(req.user.id, req.params.communityId, req.body);
    return apiResponse.sendSuccess(res,result,"Membership settings updated successfully");
  }),
};
