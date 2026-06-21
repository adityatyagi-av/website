import { Router } from "express";
import { authenticate, optionalAuthenticate } from "../../../middlewares/auth.middleware.js";
import { UserSocialController } from "../../../controllers/ecosystem/social/user-social.controller.js";

const UserSocialRouter = Router();

// GET PROFILE
UserSocialRouter.get(
  "/user/get-profile/:username",
    optionalAuthenticate,
  UserSocialController.getProfile
);


/* FOLLOW */
UserSocialRouter.post(
  "/user/follow/:userId",
  authenticate,
  UserSocialController.followUser
);

UserSocialRouter.delete(
  "/user/unfollow/:userId",
  authenticate,
  UserSocialController.unfollowUser
);

/* CONNECTIONS */
UserSocialRouter.post(
  "/user/connection/request/:userId",
  authenticate,
  UserSocialController.sendConnectionRequest
);

UserSocialRouter.post(
  "/user/connection/accept/:connectionId",
  authenticate,
  UserSocialController.acceptConnection
);

UserSocialRouter.post(
  "/user/connection/reject/:connectionId",
  authenticate,
  UserSocialController.rejectConnection
);

/* VIEWS */
UserSocialRouter.get(
  "/user/followers/:userId",
  authenticate,
  UserSocialController.getFollowers
);

UserSocialRouter.get(
  "/user/following/:userId",
  authenticate,
  UserSocialController.getFollowing
);

UserSocialRouter.get(
  "/user/connections",
  authenticate,
  UserSocialController.getConnections
);


// Connection Request Management
UserSocialRouter.get(
  "/user/connection/requests/received",
  authenticate,
  UserSocialController.getReceivedConnectionRequests
);

// Get sent connection requests (pending requests I sent)
UserSocialRouter.get(
  "/user/connection/requests/sent",
  authenticate,
  UserSocialController.getSentConnectionRequests
);

// Withdraw a sent connection request
UserSocialRouter.delete(
  "/user/connection/withdraw/:connectionId",
  authenticate,
  UserSocialController.withdrawConnectionRequest
);

UserSocialRouter.delete(
  "/user/connection/remove/:connectionId",
  authenticate,
  UserSocialController.removeConnection
);

//BLOCK / UNBLOCK

// Block a user
UserSocialRouter.post(
  "/user/block/:userId",
  authenticate,
  UserSocialController.blockUser
);

// Unblock a user
UserSocialRouter.delete(
  "/user/unblock/:userId",
  authenticate,
  UserSocialController.unblockUser
);

// Get list of blocked users
UserSocialRouter.get(
  "/user/blocked",
  authenticate,
  UserSocialController.getBlockedUsers
);

// Check if a specific user is blocked
UserSocialRouter.get(
  "/user/blocked/check/:userId",
  authenticate,
  UserSocialController.checkIfBlocked
);

// MUTUAL CONNECTIONS 

// Get mutual followers with another user
UserSocialRouter.get(
  "/user/mutual/followers/:userId",
  authenticate,
  UserSocialController.getMutualFollowers
);

// Get mutual following with another user
UserSocialRouter.get(
  "/user/mutual/following/:userId",
  authenticate,
  UserSocialController.getMutualFollowing
);

// Get mutual connections with another user
UserSocialRouter.get(
  "/user/mutual/connections/:userId",
  authenticate,
  UserSocialController.getMutualConnections
);

// RELATIONSHIP CHECKS (BULK) 

// Check relationships with multiple users (bulk operation)
UserSocialRouter.post(
  "/user/relationships/check",
  authenticate,
  UserSocialController.checkRelationships
);

// Check if multiple users follow you (bulk operation)
UserSocialRouter.post(
  "/user/followers/check",
  authenticate,
  UserSocialController.checkFollowers
);

export default UserSocialRouter;
