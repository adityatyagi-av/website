import { Router } from "express";
import {
  authenticate,
  optionalAuthenticate,
} from "../../../middlewares/auth.middleware.js";
import { EcosystemPageController } from "../../../controllers/ecosystem/page/page.controller.js";

const EcosystemPageRouter = Router();

EcosystemPageRouter.post(
  "/pages",
  authenticate,
  EcosystemPageController.createPage
);

EcosystemPageRouter.patch(
  "/pages/:pageId",
  authenticate,
  EcosystemPageController.updatePage
);

EcosystemPageRouter.get(
  "/pages/my",
  authenticate,
  EcosystemPageController.getMyPages
);

EcosystemPageRouter.get(
  "/pages/my/:pageId",
  authenticate,
  EcosystemPageController.getPageById
);

EcosystemPageRouter.get(
  "/pages/:pageId/members/search",
  authenticate,
  EcosystemPageController.searchUsersToInvite
);

EcosystemPageRouter.post(
  "/pages/:pageId/members",
  authenticate,
  EcosystemPageController.inviteMember
);

EcosystemPageRouter.patch(
  "/pages/:pageId/members/:userId/role",
  authenticate,
  EcosystemPageController.changeMemberRole
);
EcosystemPageRouter.delete(
  "/pages/:pageId/members/:userId",
  authenticate,
  EcosystemPageController.removeMember
);

EcosystemPageRouter.patch(
  "/pages/:pageId/visibility",
  authenticate,
  EcosystemPageController.updateVisibility
);
EcosystemPageRouter.get(
  "/pages/:pageId/analytics",
  authenticate,
  EcosystemPageController.getAnalytics
);

EcosystemPageRouter.get(
  "/pages/slug/:slug",
  optionalAuthenticate,
  EcosystemPageController.getPageBySlug
);

EcosystemPageRouter.get(
  "/pages/:pageId/visitors",
  authenticate,
  EcosystemPageController.getMyPageVisitors
);

EcosystemPageRouter.get(
  "/pages/:pageId/insights",
  authenticate,
  EcosystemPageController.getPageInsights
);

EcosystemPageRouter.get(
  "/pages/my-startups",
  authenticate,
  EcosystemPageController.myStartups
);

EcosystemPageRouter.get(
  "/startups/:startupId/team-members",
  authenticate,
  EcosystemPageController.getStartupTeamMembers
);

EcosystemPageRouter.get(
  "/pages/:pageId/team-members",
  authenticate,
  EcosystemPageController.getPageTeamMembers
);

EcosystemPageRouter.delete(
  "/pages/:pageId",
  authenticate,
  EcosystemPageController.deletePage
);

EcosystemPageRouter.post(
  "/pages/:pageId/leave",
  authenticate,
  EcosystemPageController.leavePage
);

EcosystemPageRouter.post(
  "/pages/:pageId/follow",
  authenticate,
  EcosystemPageController.followPage
);

EcosystemPageRouter.delete(
  "/pages/:pageId/follow",
  authenticate,
  EcosystemPageController.unfollowPage
);

EcosystemPageRouter.get(
  "/pages/:pageId/my-posts",
  authenticate,
  EcosystemPageController.getMyPagePosts
);

EcosystemPageRouter.get(
  "/pages/:pageId/posts",
  optionalAuthenticate,
  EcosystemPageController.getPagePosts
);

export default EcosystemPageRouter;
