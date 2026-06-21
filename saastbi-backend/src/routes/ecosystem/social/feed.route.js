import { Router } from "express";
import { FeedController } from "../../../controllers/ecosystem/social/feed.controller.js";
import {
  authenticate,
  optionalAuthenticate,
} from "../../../middlewares/auth.middleware.js";

const FeedRouter = Router();

// ── Public / Optional Auth feeds ────────────────────────────────────────────
FeedRouter.get(
  "/search",
  optionalAuthenticate,
  FeedController.search
);

FeedRouter.get(
  "/feed/feed-personalized",
  optionalAuthenticate,
  FeedController.getPersonalizedFeed,
);

FeedRouter.get(
  "/feed/trending",
  optionalAuthenticate,
  FeedController.getTrendingFeed,
);

FeedRouter.get(
  "/feed/discover",
  optionalAuthenticate,
  FeedController.getDiscoverFeed,
);

FeedRouter.get(
  "/feed/topic/:topic",
  optionalAuthenticate,
  FeedController.getTopicFeed,
);

FeedRouter.get(
  "/feed/ecosystem",
  optionalAuthenticate,
  FeedController.getEcosystemFeed,
);

// ── Authenticated-only feeds ────────────────────────────────────────────────
// FIX (BUG-2): Following feed requires auth — controller uses req.user.id
// without optional chaining, so unauthenticated requests would crash.

FeedRouter.get(
  "/feed/following-feed",
  authenticate,
  FeedController.getFollowingFeed,
);

FeedRouter.get(
  "/feed/connections",
  authenticate,
  FeedController.getConnectionsFeed,
);

// ── Preferences (auth required) ─────────────────────────────────────────────

FeedRouter.get(
  "/feed/preferences",
  authenticate,
  FeedController.getFeedPreferences,
);

FeedRouter.put(
  "/feed/preferences",
  authenticate,
  FeedController.updateFeedPreferences,
);

// ── Actions ─────────────────────────────────────────────────────────────────

FeedRouter.post(
  "/feed/refresh",
  optionalAuthenticate,
  FeedController.refreshFeed,
);

FeedRouter.post(
  "/feed/posts/:postId/view",
  optionalAuthenticate,
  FeedController.recordPostView,
);

FeedRouter.post(
  "/feed/posts/:postId/engagement",
  optionalAuthenticate,
  FeedController.recordEngagement,
);

FeedRouter.post(
  "/feed/posts/:postId/hide",
  authenticate,
  FeedController.hidePost,
);

FeedRouter.post(
  "/posts/:postId/report",
  authenticate,
  FeedController.reportPost,
);

export default FeedRouter;