import { UserSocialService } from "../../../services/ecosystem/social/user-social.service.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";

export const UserSocialController = {
  getProfile: asyncHandler(async (req, res) => {
    const { username } = req.params;
    const viewerId = req.user?.id ?? null;
    const ipAddress = req.ip;
    const userAgent = req.headers["user-agent"];

    const result = await UserSocialService.getProfile({
      username,
      viewerId,
      ipAddress,
      userAgent,
    });
    return apiResponse.sendSuccess(res, result, "Profile fetched successfully");
  }),

  followUser: asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const result = await UserSocialService.followUser({
      followerId: req.user.id,
      followingId: userId,
    });

    return apiResponse.sendSuccess(res, result, "User followed successfully");
  }),

  unfollowUser: asyncHandler(async (req, res) => {
    const { userId } = req.params;

    await UserSocialService.unfollowUser({
      followerId: req.user.id,
      followingId: userId,
    });

    return apiResponse.sendSuccess(res, null, "User unfollowed successfully");
  }),

  sendConnectionRequest: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { message } = req.body;

    const result = await UserSocialService.sendConnectionRequest({
      senderId: req.user.id,
      receiverId: userId,
      message,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Connection request sent successfully"
    );
  }),

  acceptConnection: asyncHandler(async (req, res) => {
    const { connectionId } = req.params;

    const result = await UserSocialService.acceptConnection({
      connectionId,
      userId: req.user.id,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Connection accepted successfully"
    );
  }),

  rejectConnection: asyncHandler(async (req, res) => {
    const { connectionId } = req.params;

    const result = await UserSocialService.rejectConnection({
      connectionId,
      userId: req.user.id,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Connection rejected successfully"
    );
  }),

  getFollowers: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const viewerId = req.user?.id ?? null;

    const { page, limit, search, searchFields, sortBy, order } = req.query;

    const result = await UserSocialService.getFollowers(userId, viewerId, {
      page,
      limit,
      search,
      searchFields,
      sortBy,
      order,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Followers fetched successfully"
    );
  }),

  getFollowing: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const viewerId = req.user?.id ?? null;

    const { page, limit, search, searchFields, sortBy, order } = req.query;

    const result = await UserSocialService.getFollowing(userId, viewerId, {
      page,
      limit,
      search,
      searchFields,
      sortBy,
      order,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Following fetched successfully"
    );
  }),

  getConnections: asyncHandler(async (req, res) => {
    const { page, limit, search, searchFields, sortBy, order } = req.query;

    const result = await UserSocialService.getConnections(req.user.id, {
      page,
      limit,
      search,
      searchFields,
      sortBy,
      order,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Connections fetched successfully"
    );
  }),

  getReceivedConnectionRequests: asyncHandler(async (req, res) => {
    const { page, limit, search, sortBy, order } = req.query;

    const result =
      await UserSocialService.getReceivedConnectionRequests(
        req.user.id,
        { page, limit, search, sortBy, order }
      );

    return apiResponse.sendSuccess(
      res,
      result,
      "Received connection requests fetched successfully"
    );
  }),

  getSentConnectionRequests: asyncHandler(async (req, res) => {
    const { page, limit, search, sortBy, order } = req.query;

    const result = await UserSocialService.getSentConnectionRequests(
      req.user.id,
      { page, limit, search, sortBy, order }
    );

    return apiResponse.sendSuccess(
      res,
      result,
      "Sent connection requests fetched successfully"
    );
  }),

  withdrawConnectionRequest: asyncHandler(async (req, res) => {
    const { connectionId } = req.params;

    await UserSocialService.withdrawConnectionRequest({
      connectionId,
      userId: req.user.id,
    });

    return apiResponse.sendSuccess(
      res,
      null,
      "Connection request withdrawn successfully"
    );
  }),

  removeConnection: asyncHandler(async (req, res) => {
    const { connectionId } = req.params;
    await UserSocialService.removeConnection({
      connectionId,
      userId: req.user.id,
    });
    return apiResponse.sendSuccess(
      res,
      null,
      "Connection removed successfully"
    );
  }),


  blockUser: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { reason } = req.body;

    const result = await UserSocialService.blockUser({
      blockerId: req.user.id,
      blockedId: userId,
      reason,
    });

    return apiResponse.sendSuccess(res, result, "User blocked successfully");
  }),

  unblockUser: asyncHandler(async (req, res) => {
    const { userId } = req.params;

    await UserSocialService.unblockUser({
      blockerId: req.user.id,
      blockedId: userId,
    });

    return apiResponse.sendSuccess(res, null, "User unblocked successfully");
  }),

  getBlockedUsers: asyncHandler(async (req, res) => {
    const { page, limit, search, sortBy, order } = req.query;

    const result = await UserSocialService.getBlockedUsers(
      req.user.id,
      { page, limit, search, sortBy, order }
    );

    return apiResponse.sendSuccess(
      res,
      result,
      "Blocked users fetched successfully"
    );
  }),

  checkIfBlocked: asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const result = await UserSocialService.checkIfBlocked({
      userId: req.user.id,
      targetUserId: userId,
    });

    return apiResponse.sendSuccess(res, result, "Block status checked");
  }),


  getMutualFollowers: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page, limit, search, sortBy, order } = req.query;

    const result = await UserSocialService.getMutualFollowers(
      req.user.id,
      userId,
      { page, limit, search, sortBy, order }
    );

    return apiResponse.sendSuccess(
      res,
      result,
      "Mutual followers fetched successfully"
    );
  }),

  getMutualFollowing: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page, limit, search, sortBy, order } = req.query;

    const result = await UserSocialService.getMutualFollowing(
      req.user.id,
      userId,
      { page, limit, search, sortBy, order }
    );

    return apiResponse.sendSuccess(
      res,
      result,
      "Mutual following fetched successfully"
    );
  }),

  getMutualConnections: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { page, limit, search, sortBy, order } = req.query;

    const result = await UserSocialService.getMutualConnections(
      req.user.id,
      userId,
      { page, limit, search, sortBy, order }
    );

    return apiResponse.sendSuccess(
      res,
      result,
      "Mutual connections fetched successfully"
    );
  }),


  checkRelationships: asyncHandler(async (req, res) => {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return apiResponse.sendError(
        res,
        "userIds must be a non-empty array",
        400
      );
    }

    if (userIds.length > 100) {
      return apiResponse.sendError(
        res,
        "Maximum 100 users can be checked at once",
        400
      );
    }

    const result = await UserSocialService.checkRelationships(
      req.user.id,
      userIds
    );

    return apiResponse.sendSuccess(
      res,
      result,
      "Relationships checked successfully"
    );
  }),

  checkFollowers: asyncHandler(async (req, res) => {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return apiResponse.sendError(
        res,
        "userIds must be a non-empty array",
        400
      );
    }

    if (userIds.length > 100) {
      return apiResponse.sendError(
        res,
        "Maximum 100 users can be checked at once",
        400
      );
    }

    const result = await UserSocialService.checkFollowers(
      req.user.id,
      userIds
    );

    return apiResponse.sendSuccess(
      res,
      result,
      "Follower status checked successfully"
    );
  }),

};
