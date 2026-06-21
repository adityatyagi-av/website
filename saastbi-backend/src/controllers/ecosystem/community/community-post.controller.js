import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";
import { CommunityPostService } from "../../../services/ecosystem/community/community-post.service.js";
import { CommunityEngagementService } from "../../../services/ecosystem/community/community-engagement.service.js";

export const CommunityPostController = {
  createPost: asyncHandler(async (req, res) => {
    
    const result = await CommunityPostService.createPost(req.user.id, req.params.communityId, req.body);
    return apiResponse.sendCreated(res, result, "Post created successfully");
  }),

  updatePost: asyncHandler(async (req, res) => {
    const result = await CommunityPostService.updatePost(req.user.id, req.params.postId, req.body);
    return apiResponse.sendUpdated(res, result, "Post updated successfully");
  }),

  deletePost: asyncHandler(async (req, res) => {
    const result = await CommunityPostService.deletePost(req.user.id, req.params.postId);
    return apiResponse.sendDeleted(res, result, "Post deleted successfully");
  }),

  getPost: asyncHandler(async (req, res) => {
    const viewerId = req.user?.id || null;
    const result = await CommunityPostService.getPost(req.params.postId, viewerId);
    return apiResponse.sendSuccess(res, result);
  }),

  getCommunityFeed: asyncHandler(async (req, res) => {
    const viewerId = req.user?.id || null;
    const result = await CommunityPostService.getCommunityFeed(req.params.communityId, viewerId, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  getChannelFeed: asyncHandler(async (req, res) => {
    const viewerId = req.user?.id || null;
    const result = await CommunityPostService.getChannelFeed(req.params.communityId, req.params.channelId, viewerId, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  pinPost: asyncHandler(async (req, res) => {
    const result = await CommunityPostService.pinPost(req.user.id, req.params.postId);
    return apiResponse.sendSuccess(res, result, "Post pinned successfully");
  }),

  unpinPost: asyncHandler(async (req, res) => {
    const result = await CommunityPostService.unpinPost(req.user.id, req.params.postId);
    return apiResponse.sendSuccess(res, result, "Post unpinned successfully");
  }),

  approvePost: asyncHandler(async (req, res) => {
    const result = await CommunityPostService.approvePost(req.user.id, req.params.postId);
    return apiResponse.sendSuccess(res, result, "Post approved successfully");
  }),

  rejectPost: asyncHandler(async (req, res) => {
    const result = await CommunityPostService.rejectPost(req.user.id, req.params.postId);
    return apiResponse.sendSuccess(res, result, "Post rejected");
  }),

  getPendingPosts: asyncHandler(async (req, res) => {
    const result = await CommunityPostService.getPendingPosts(req.user.id, req.params.communityId, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  searchWithinCommunity: asyncHandler(async (req, res) => {
    const viewerId = req.user?.id || null;
    const result = await CommunityPostService.searchWithinCommunity(req.params.communityId, viewerId, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  likePost: asyncHandler(async (req, res) => {
    const result = await CommunityEngagementService.likePost(req.user.id, req.params.postId);
    return apiResponse.sendSuccess(res, result, "Post liked");
  }),

  unlikePost: asyncHandler(async (req, res) => {
    const result = await CommunityEngagementService.unlikePost(req.user.id, req.params.postId);
    return apiResponse.sendSuccess(res, result, "Post unliked");
  }),

  getPostLikes: asyncHandler(async (req, res) => {
    const result = await CommunityEngagementService.getPostLikes(req.params.postId, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  bookmarkPost: asyncHandler(async (req, res) => {
    const result = await CommunityEngagementService.bookmarkPost(req.user.id, req.params.postId);
    return apiResponse.sendSuccess(res, result, "Post bookmarked");
  }),

  unbookmarkPost: asyncHandler(async (req, res) => {
    const result = await CommunityEngagementService.unbookmarkPost(req.user.id, req.params.postId);
    return apiResponse.sendSuccess(res, result, "Bookmark removed");
  }),

  getBookmarkedPosts: asyncHandler(async (req, res) => {
    const result = await CommunityEngagementService.getBookmarkedPosts(req.user.id, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  sharePost: asyncHandler(async (req, res) => {
    const result = await CommunityEngagementService.sharePost(req.user.id, req.params.postId, req.body.comment);
    return apiResponse.sendSuccess(res, result, "Post shared");
  }),

  addComment: asyncHandler(async (req, res) => {
    const result = await CommunityEngagementService.addComment(req.user.id, req.params.postId, req.body.content, req.body.parentId);
    return apiResponse.sendCreated(res, result, "Comment added");
  }),

  updateComment: asyncHandler(async (req, res) => {
    const result = await CommunityEngagementService.updateComment(req.user.id, req.params.commentId, req.body.content);
    return apiResponse.sendUpdated(res, result, "Comment updated");
  }),

  deleteComment: asyncHandler(async (req, res) => {
    const result = await CommunityEngagementService.deleteComment(req.user.id, req.params.commentId);
    return apiResponse.sendDeleted(res, result, "Comment deleted");
  }),

  getComments: asyncHandler(async (req, res) => {
    const result = await CommunityEngagementService.getComments(req.params.postId, { ...req.query, viewerId: req.user?.id });
    return apiResponse.sendSuccess(res, result);
  }),

  getReplies: asyncHandler(async (req, res) => {
    const result = await CommunityEngagementService.getReplies(req.params.commentId, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  likeComment: asyncHandler(async (req, res) => {
    const result = await CommunityEngagementService.likeComment(req.user.id, req.params.commentId);
    return apiResponse.sendSuccess(res, result, "Comment liked");
  }),

  unlikeComment: asyncHandler(async (req, res) => {
    const result = await CommunityEngagementService.unlikeComment(req.user.id, req.params.commentId);
    return apiResponse.sendSuccess(res, result, "Comment unliked");
  }),

  votePoll: asyncHandler(async (req, res) => {
    const result = await CommunityEngagementService.votePoll(req.user.id, req.params.pollId, req.body.optionId);
    return apiResponse.sendSuccess(res, result, "Vote recorded");
  }),

  reportPost: asyncHandler(async (req, res) => {
    const result = await CommunityEngagementService.reportPost(req.user.id, req.params.postId, req.body.reason, req.body.description);
    return apiResponse.sendSuccess(res, result, "Post reported");
  }),

  reportComment: asyncHandler(async (req, res) => {
    const result = await CommunityEngagementService.reportComment(req.user.id, req.params.commentId, req.body.reason, req.body.description);
    return apiResponse.sendSuccess(res, result, "Comment reported");
  }),
};
