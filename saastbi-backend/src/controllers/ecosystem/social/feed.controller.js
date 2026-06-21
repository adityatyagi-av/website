import { FeedService } from "../../../services/ecosystem/social/feed.service.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";

export const FeedController = {
  search: asyncHandler(async (req, res) => {
    const result = await FeedService.search(
      req.user?.id,
      req.query
    );
    return apiResponse.sendSuccess(
      res,
      result,
      "Search results fetched successfully"
    );
  }),

  getPersonalizedFeed: asyncHandler(async (req, res) => {
    const userId = req.user?.id ?? null;
    const { cursor, limit = 20, filter } = req.query;
    const ipAddress = req.ip;
    const userAgent = req.headers["user-agent"];

    const result = await FeedService.getPersonalizedFeed({
      userId,
      cursor,
      limit: parseInt(limit),
      filter,
      ipAddress,
      userAgent,
    });

    return apiResponse.sendSuccess(res, result, "Feed fetched successfully");
  }),

  getFollowingFeed: asyncHandler(async (req, res) => {
    // FIX (BUG-2): This route now uses `authenticate` so req.user always exists
    const userId = req.user.id;
    const { cursor, limit = 20, filter } = req.query;

    const result = await FeedService.getFollowingFeed({
      userId,
      cursor,
      limit: parseInt(limit),
      filter,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      result.message || "Following feed fetched successfully",
    );
  }),

  getTrendingFeed: asyncHandler(async (req, res) => {
    const userId = req.user?.id ?? null;
    const { cursor, limit = 20, timeRange = "24h" } = req.query;

    const result = await FeedService.getTrendingFeed({
      userId,
      cursor,
      limit: parseInt(limit),
      timeRange,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Trending feed fetched successfully",
    );
  }),

  getDiscoverFeed: asyncHandler(async (req, res) => {
    const userId = req.user?.id ?? null;
    const { cursor, limit = 20 } = req.query;

    const result = await FeedService.getDiscoverFeed({
      userId,
      cursor,
      limit: parseInt(limit),
    });

    return apiResponse.sendSuccess(
      res,
      result,
      result.message || "Discover feed fetched successfully",
    );
  }),

  getTopicFeed: asyncHandler(async (req, res) => {
    const userId = req.user?.id ?? null;
    const { topic } = req.params;
    const { cursor, limit = 20 } = req.query;

    const result = await FeedService.getTopicFeed({
      userId,
      topic,
      cursor,
      limit: parseInt(limit),
    });

    return apiResponse.sendSuccess(
      res,
      result,
      result.message || `Feed for topic '${topic}' fetched successfully`,
    );
  }),

  getConnectionsFeed: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { cursor, limit = 20, filter } = req.query;

    const result = await FeedService.getConnectionsFeed({
      userId,
      cursor,
      limit: parseInt(limit),
      filter,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      result.message || "Connections feed fetched successfully",
    );
  }),

  recordPostView: asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const viewerId = req.user?.id ?? null;
    const ipAddress = req.ip;
    const userAgent = req.headers["user-agent"];

    await FeedService.recordPostView({
      postId,
      viewerId,
      ipAddress,
      userAgent,
    });

    return apiResponse.sendSuccess(res, null, "Post view recorded");
  }),

  recordEngagement: asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const viewerId = req.user?.id ?? null;
    const { dwellTime, scrollDepth, clickedLink, viewedMedia } = req.body;

    await FeedService.recordEngagement({
      postId,
      viewerId,
      dwellTime,
      scrollDepth,
      clickedLink,
      viewedMedia,
    });

    return apiResponse.sendSuccess(res, null, "Engagement recorded");
  }),

  /**
   * Hide post from feed
   * POST /api/v1/feed/posts/:postId/hide
   */
  hidePost: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { postId } = req.params;
    const { reason } = req.body;

    await FeedService.hidePost({
      userId,
      postId,
      reason,
    });

    return apiResponse.sendSuccess(
      res,
      null,
      "Post hidden from feed. You won't see it again.",
    );
  }),

  /**
   * Report post
   * POST /api/v1/feed/posts/:postId/report
   */
  reportPost: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { postId } = req.params;
    const { reason, description } = req.body;

    const report = await FeedService.reportPost({
      reporterId: userId,
      postId,
      reason,
      description,
    });

    return apiResponse.sendSuccess(
      res,
      report,
      "Post reported successfully. Our team will review it.",
    );
  }),

  /**
   * Get feed preferences
   * GET /api/v1/feed/preferences
   */
  getFeedPreferences: asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const preferences = await FeedService.getFeedPreferences(userId);

    return apiResponse.sendSuccess(
      res,
      preferences,
      "Feed preferences fetched successfully",
    );
  }),

  /**
   * Update feed preferences
   * PUT /api/v1/feed/preferences
   */
  updateFeedPreferences: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const updates = req.body;

    const preferences = await FeedService.updateFeedPreferences(
      userId,
      updates,
    );

    return apiResponse.sendSuccess(
      res,
      preferences,
      "Feed preferences updated successfully",
    );
  }),

  /**
   * Refresh feed (clear cache)
   * POST /api/v1/feed/refresh
   */
  refreshFeed: asyncHandler(async (req, res) => {
    const userId = req.user?.id ?? null;

    await FeedService.clearFeedCache(userId);

    return apiResponse.sendSuccess(
      res,
      null,
      "Feed cache cleared. Fresh content will load on next request.",
    );
  }),

  /**
   * Get startup ecosystem feed
   * GET /api/v1/feed/ecosystem
   * FIX (BUG-4): Now actually passes sector and stage to the service
   */
  getEcosystemFeed: asyncHandler(async (req, res) => {
    const userId = req.user?.id ?? null;
    const { cursor, limit = 20, sector, stage } = req.query;

    const result = await FeedService.getEcosystemFeed({
      userId,
      cursor,
      limit: parseInt(limit),
      sector: sector || null,
      stage: stage || null,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Startup ecosystem feed fetched successfully",
    );
  }),
};