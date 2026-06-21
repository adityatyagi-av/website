import { Router } from "express";
import { authenticate, optionalAuthenticate } from "../../../middlewares/auth.middleware.js";
import { CommunityController } from "../../../controllers/ecosystem/community/community.controller.js";
import { CommunityMemberController } from "../../../controllers/ecosystem/community/community-member.controller.js";
import { CommunityPostController } from "../../../controllers/ecosystem/community/community-post.controller.js";
import { CommunityModerationController } from "../../../controllers/ecosystem/community/community-moderation.controller.js";
import { CommunityDiscoveryService } from "../../../services/ecosystem/community/community-discovery.service.js";
import { CommunityValidation, validate } from "../../../validators/ecosystem/community.validator.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";

const CommunityRouter = Router();

// ── Discovery (public/optional auth) ──
CommunityRouter.get("/community/discover", optionalAuthenticate, validate(CommunityValidation.discoverCommunities), asyncHandler(async (req, res) => {
  const result = await CommunityDiscoveryService.discoverCommunities(req.user?.id, req.query);
  return apiResponse.sendSuccess(res, result);
}));

CommunityRouter.get("/community/trending", optionalAuthenticate, asyncHandler(async (req, res) => {
  const result = await CommunityDiscoveryService.getTrendingCommunities(req.user?.id, req.query);
  return apiResponse.sendSuccess(res, result);
}));

CommunityRouter.get("/community/recommended", authenticate, asyncHandler(async (req, res) => {
  const result = await CommunityDiscoveryService.getRecommendedCommunities(req.user.id, req.query);
  return apiResponse.sendSuccess(res, result);
}));

CommunityRouter.get("/community/categories", optionalAuthenticate, asyncHandler(async (req, res) => {
  const result = await CommunityDiscoveryService.getCommunitiesByCategory(req.user?.id);
  return apiResponse.sendSuccess(res, result);
}));

CommunityRouter.get("/community/my-communities", authenticate, asyncHandler(async (req, res) => {
  const result = await CommunityDiscoveryService.getMyCommunities(req.user.id, req.query);
  return apiResponse.sendSuccess(res, result);
}));

CommunityRouter.get("/community/bookmarks", authenticate, CommunityPostController.getBookmarkedPosts);

// ── Invite accept (before :slug param route) ──
CommunityRouter.post("/community/invite/:code/accept", authenticate, CommunityMemberController.acceptInvite);
CommunityRouter.post("/community/invite/:inviteId/decline", authenticate, CommunityMemberController.declineInvite);

// ── Community detail (public/optional auth) ──
CommunityRouter.get("/community/:slug", optionalAuthenticate, CommunityController.getCommunityBySlug);

// ── Community CRUD ──
CommunityRouter.post("/community", authenticate, CommunityController.createCommunity);
CommunityRouter.patch("/community/:communityId", authenticate, CommunityController.updateCommunity);
CommunityRouter.delete("/community/:communityId", authenticate, CommunityController.deleteCommunity);
CommunityRouter.patch("/community/:communityId/settings", authenticate, CommunityController.updateSettings);
CommunityRouter.post("/community/:communityId/transfer", authenticate, validate(CommunityValidation.transferOwnership), CommunityController.transferOwnership);

// ── Channels ──
CommunityRouter.post("/community/:communityId/channel", authenticate, validate(CommunityValidation.createChannel), CommunityController.addChannel);
CommunityRouter.patch("/community/channel/:channelId", authenticate, validate(CommunityValidation.updateChannel), CommunityController.updateChannel);
CommunityRouter.delete("/community/channel/:channelId", authenticate, CommunityController.deleteChannel);
CommunityRouter.patch("/community/:communityId/channels/reorder", authenticate, validate(CommunityValidation.reorderChannels), CommunityController.reorderChannels);

// ── Rules ──
CommunityRouter.post("/community/:communityId/rule", authenticate, validate(CommunityValidation.createRule), CommunityController.addRule);
CommunityRouter.patch("/community/rule/:ruleId", authenticate, validate(CommunityValidation.updateRule), CommunityController.updateRule);
CommunityRouter.delete("/community/rule/:ruleId", authenticate, CommunityController.deleteRule);
CommunityRouter.patch("/community/:communityId/rules/reorder", authenticate, validate(CommunityValidation.reorderRules), CommunityController.reorderRules);

// ── Membership ──
CommunityRouter.post("/community/:communityId/join", authenticate, CommunityMemberController.joinCommunity);
CommunityRouter.post("/community/:communityId/join/submit", authenticate, CommunityMemberController.submitJoinRequest);
CommunityRouter.post("/community/:communityId/leave", authenticate, CommunityMemberController.leaveCommunity);
CommunityRouter.get("/community/:communityId/members", optionalAuthenticate, CommunityMemberController.getMembers);
CommunityRouter.patch("/community/member/:memberId/role", authenticate, validate(CommunityValidation.changeMemberRole), CommunityMemberController.changeMemberRole);
CommunityRouter.post("/community/:communityId/invite", authenticate, validate(CommunityValidation.inviteMember), CommunityMemberController.inviteMember);
CommunityRouter.get("/community/:communityId/invite-link", authenticate, CommunityMemberController.generateInviteLink);
CommunityRouter.get("/community/invite/:code/validate",optionalAuthenticate,CommunityMemberController.validateInviteCode);
CommunityRouter.get("/community/:communityId/join-requests", authenticate, CommunityMemberController.getPendingRequests);
CommunityRouter.patch("/community/join-request/:requestId/approve", authenticate, CommunityMemberController.approveJoinRequest);
CommunityRouter.patch("/community/join-request/:requestId/reject", authenticate, CommunityMemberController.rejectJoinRequest);
CommunityRouter.patch("/community/:communityId/notification-preference", authenticate, validate(CommunityValidation.notificationPreference), CommunityMemberController.updateNotificationPreference);

// ── Join Questions ──
CommunityRouter.post("/community/:communityId/join-question", authenticate, validate(CommunityValidation.createJoinQuestion), CommunityMemberController.addJoinQuestion);
CommunityRouter.get("/community/:communityId/join-questions",authenticate,CommunityMemberController.getJoinQuestions);
CommunityRouter.patch("/community/join-question/:questionId", authenticate, validate(CommunityValidation.updateJoinQuestion), CommunityMemberController.updateJoinQuestion);
CommunityRouter.delete("/community/join-question/:questionId", authenticate, CommunityMemberController.deleteJoinQuestion);
CommunityRouter.patch("/community/:communityId/join-questions/reorder", authenticate, CommunityMemberController.reorderJoinQuestions);

// ── Moderation ──
CommunityRouter.post("/community/member/:memberId/ban", authenticate, validate(CommunityValidation.banMember), CommunityMemberController.banMember);
CommunityRouter.post("/community/member/:memberId/unban", authenticate, CommunityMemberController.unbanMember);
CommunityRouter.post("/community/member/:memberId/mute", authenticate, validate(CommunityValidation.muteMember), CommunityMemberController.muteMember);
CommunityRouter.post("/community/member/:memberId/unmute", authenticate, CommunityMemberController.unmuteMember);
CommunityRouter.post("/community/member/:memberId/warn", authenticate, validate(CommunityValidation.warnMember), CommunityMemberController.warnMember);
CommunityRouter.get("/community/:communityId/ban-log", authenticate, CommunityMemberController.getBanLog);
CommunityRouter.get("/community/:communityId/moderation-queue", authenticate, CommunityModerationController.getModerationQueue);
CommunityRouter.patch("/community/moderation/:reportId/review", authenticate, validate(CommunityValidation.reviewReport), CommunityModerationController.reviewReport);
CommunityRouter.post("/community/:communityId/moderation/bulk", authenticate, validate(CommunityValidation.bulkModerate), CommunityModerationController.bulkModerate);
CommunityRouter.get("/community/:communityId/moderation/member/:userId", authenticate, CommunityModerationController.getMemberModerationHistory);
CommunityRouter.get("/community/:communityId/activity-log", authenticate, CommunityModerationController.getActivityLog);

// ── Posts ──
CommunityRouter.post("/community/:communityId/post", authenticate, CommunityPostController.createPost);
CommunityRouter.patch("/community/post/:postId", authenticate, validate(CommunityValidation.updatePost), CommunityPostController.updatePost);
CommunityRouter.delete("/community/post/:postId", authenticate, CommunityPostController.deletePost);
CommunityRouter.get("/community/:communityId/feed", optionalAuthenticate, CommunityPostController.getCommunityFeed);
CommunityRouter.get("/community/:communityId/channel/:channelId/feed", optionalAuthenticate, CommunityPostController.getChannelFeed);
CommunityRouter.get("/community/post/:postId", optionalAuthenticate, CommunityPostController.getPost);
CommunityRouter.post("/community/post/:postId/pin", authenticate, CommunityPostController.pinPost);
CommunityRouter.delete("/community/post/:postId/pin", authenticate, CommunityPostController.unpinPost);
CommunityRouter.get("/community/:communityId/pending-posts", authenticate, CommunityPostController.getPendingPosts);
CommunityRouter.patch("/community/post/:postId/approve", authenticate, CommunityPostController.approvePost);
CommunityRouter.patch("/community/post/:postId/reject", authenticate, CommunityPostController.rejectPost);
CommunityRouter.get("/community/:communityId/search", optionalAuthenticate, CommunityPostController.searchWithinCommunity);

// ── Post Engagement ──
CommunityRouter.post("/community/post/:postId/like", authenticate, CommunityPostController.likePost);
CommunityRouter.delete("/community/post/:postId/like", authenticate, CommunityPostController.unlikePost);
CommunityRouter.get("/community/post/:postId/likes", optionalAuthenticate, CommunityPostController.getPostLikes);
CommunityRouter.post("/community/post/:postId/bookmark", authenticate, CommunityPostController.bookmarkPost);
CommunityRouter.delete("/community/post/:postId/bookmark", authenticate, CommunityPostController.unbookmarkPost);
CommunityRouter.post("/community/post/:postId/share", authenticate, CommunityPostController.sharePost);
CommunityRouter.post("/community/post/:postId/comment", authenticate, validate(CommunityValidation.createComment), CommunityPostController.addComment);
CommunityRouter.patch("/community/comment/:commentId", authenticate, validate(CommunityValidation.updateComment), CommunityPostController.updateComment);
CommunityRouter.delete("/community/comment/:commentId", authenticate, CommunityPostController.deleteComment);
CommunityRouter.get("/community/post/:postId/comments", optionalAuthenticate, CommunityPostController.getComments);
CommunityRouter.get("/community/comment/:commentId/replies", optionalAuthenticate, CommunityPostController.getReplies);
CommunityRouter.post("/community/comment/:commentId/like", authenticate, CommunityPostController.likeComment);
CommunityRouter.delete("/community/comment/:commentId/like", authenticate, CommunityPostController.unlikeComment);
CommunityRouter.post("/community/poll/:pollId/vote", authenticate, validate(CommunityValidation.votePoll), CommunityPostController.votePoll);
CommunityRouter.post("/community/post/:postId/report", authenticate, validate(CommunityValidation.reportContent), CommunityPostController.reportPost);
CommunityRouter.post("/community/comment/:commentId/report", authenticate, validate(CommunityValidation.reportContent), CommunityPostController.reportComment);

// ── Analytics ──
CommunityRouter.get("/community/:communityId/analytics", authenticate, CommunityController.getAnalytics);
CommunityRouter.get("/community/:communityId/analytics/growth", authenticate, CommunityController.getMemberGrowth);
CommunityRouter.get("/community/:communityId/analytics/engagement", authenticate, CommunityController.getEngagementMetrics);
CommunityRouter.get("/community/:communityId/analytics/contributors", authenticate, CommunityController.getTopContributors);
CommunityRouter.get("/community/:communityId/analytics/content", authenticate, CommunityController.getContentBreakdown);
CommunityRouter.get("/community/:communityId/analytics/retention", authenticate, CommunityController.getMemberRetention);

// -- Membership Rules --
CommunityRouter.get("/community/:communityId/membership-rules",authenticate,CommunityController.getMembershipRules);
CommunityRouter.patch("/community/:communityId/membership-rules",authenticate,validate(CommunityValidation.updateMembershipRules),CommunityController.updateMembershipRules);

// ── Community Member Preview ──
CommunityRouter.get("/community/:communityId/preview-members", optionalAuthenticate, asyncHandler(async (req, res) => {
  const result = await CommunityDiscoveryService.getCommunityPreview(req.params.communityId, req.query);
  return apiResponse.sendSuccess(res, result);
}));

export default CommunityRouter;
