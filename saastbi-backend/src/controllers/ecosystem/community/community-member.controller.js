import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";
import { CommunityMembershipService } from "../../../services/ecosystem/community/community-membership.service.js";

export const CommunityMemberController = {
  joinCommunity: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.joinCommunity(req.user.id, req.params.communityId);
    if (result.requiresApproval) {
      return apiResponse.sendSuccess(res, result, result.requiresQuestions ? "Please answer the join questions" : "Join request submitted");
    }
    return apiResponse.sendSuccess(res, result, "Joined community successfully");
  }),

  submitJoinRequest: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.submitJoinRequest(req.user.id, req.params.communityId, req.body?.answers || null);
    return apiResponse.sendSuccess(res, result, "Join request submitted for review");
  }),

  leaveCommunity: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.leaveCommunity(req.user.id, req.params.communityId);
    return apiResponse.sendSuccess(res, result, "Left community successfully");
  }),

  approveJoinRequest: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.approveJoinRequest(req.user.id, req.params.requestId);
    return apiResponse.sendSuccess(res, result, "Join request approved");
  }),

  rejectJoinRequest: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.rejectJoinRequest(req.user.id, req.params.requestId);
    return apiResponse.sendSuccess(res, result, "Join request rejected");
  }),

  getPendingRequests: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.getPendingRequests(req.user.id, req.params.communityId, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  inviteMember: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.inviteMember(req.user.id, req.params.communityId, req.body);
    return apiResponse.sendCreated(res, result, "Invitation sent successfully");
  }),

  generateInviteLink: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.generateInviteLink(req.user.id, req.params.communityId);
    return apiResponse.sendSuccess(res, result);
  }),
  
  validateInviteCode: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.validateInviteCode(
      req.params.code
    );
  
    return apiResponse.sendSuccess(res, result);
  }),

  acceptInvite: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.acceptInvite(req.user.id, req.params.code);
    return apiResponse.sendSuccess(res, result, "Invite accepted successfully");
  }),

  declineInvite: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.declineInvite(req.user.id, req.params.inviteId);
    return apiResponse.sendSuccess(res, result, "Invite declined");
  }),

  getMembers: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.getMembers(req.params.communityId, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  changeMemberRole: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.changeMemberRole(req.user.id, req.params.memberId, req.body.role);
    return apiResponse.sendSuccess(res, result, "Member role updated successfully");
  }),

  banMember: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.banMember(req.user.id, req.params.memberId, req.body.reason, req.body.duration);
    return apiResponse.sendSuccess(res, result, "Member banned successfully");
  }),

  unbanMember: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.unbanMember(req.user.id, req.params.memberId);
    return apiResponse.sendSuccess(res, result, "Member unbanned successfully");
  }),

  muteMember: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.muteMember(req.user.id, req.params.memberId, req.body.reason, req.body.duration);
    return apiResponse.sendSuccess(res, result, "Member muted successfully");
  }),

  unmuteMember: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.unmuteMember(req.user.id, req.params.memberId);
    return apiResponse.sendSuccess(res, result, "Member unmuted successfully");
  }),

  warnMember: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.warnMember(req.user.id, req.params.memberId, req.body.reason);
    return apiResponse.sendSuccess(res, result, "Warning issued successfully");
  }),

  getBanLog: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.getBanLog(req.user.id, req.params.communityId, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  updateNotificationPreference: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.updateNotificationPreference(req.user.id, req.params.communityId, req.body.preference);
    return apiResponse.sendSuccess(res, result, "Notification preference updated");
  }),

  addJoinQuestion: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.addJoinQuestion(req.user.id, req.params.communityId, req.body);
    return apiResponse.sendCreated(res, result, "Join question added");
  }),

  getJoinQuestions: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.getJoinQuestions(
      req.user.id,
      req.params.communityId
    );
  
    return apiResponse.sendSuccess(
      res,
      result,
      "Join questions fetched successfully"
    );
  }),

  updateJoinQuestion: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.updateJoinQuestion(req.user.id, req.params.questionId, req.body);
    return apiResponse.sendUpdated(res, result, "Join question updated");
  }),

  deleteJoinQuestion: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.deleteJoinQuestion(req.user.id, req.params.questionId);
    return apiResponse.sendDeleted(res, result, "Join question deleted");
  }),

  reorderJoinQuestions: asyncHandler(async (req, res) => {
    const result = await CommunityMembershipService.reorderJoinQuestions(req.user.id, req.params.communityId, req.body.orderedIds);
    return apiResponse.sendSuccess(res, result, "Join questions reordered");
  }),
};
