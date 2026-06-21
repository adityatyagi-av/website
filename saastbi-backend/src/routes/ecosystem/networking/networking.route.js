import { Router } from "express";
import {
  authenticate,
  optionalAuthenticate,
} from "../../../middlewares/auth.middleware.js";
import { NetworkingController } from "../../../controllers/ecosystem/networking/networking.controller.js";

const NetworkingRouter = Router();

NetworkingRouter.get(
  "/networking/discover",
  optionalAuthenticate,
  NetworkingController.discover,
);

NetworkingRouter.get(
  "/networking/search",
  optionalAuthenticate,
  NetworkingController.globalSearch,
);

NetworkingRouter.get(
  "/networking/people",
  optionalAuthenticate,
  NetworkingController.discoverPeople,
);

NetworkingRouter.get(
  "/networking/people/:userId",
  optionalAuthenticate,
  NetworkingController.getPersonProfile,
);

NetworkingRouter.get(
  "/networking/cofounders",
  authenticate,
  NetworkingController.getCofounderMatches,
);

NetworkingRouter.get(
  "/networking/cofounders/:userId",
  authenticate,
  NetworkingController.getCofounderProfile,
);

NetworkingRouter.get(
  "/networking/cofounder-preferences",
  authenticate,
  NetworkingController.getCofounderPreferences,
);

NetworkingRouter.post(
  "/networking/cofounder-preferences",
  authenticate,
  NetworkingController.upsertCofounderPreferences,
);

NetworkingRouter.get(
  "/networking/incubators",
  optionalAuthenticate,
  NetworkingController.discoverIncubators,
);

NetworkingRouter.get(
  "/networking/incubators/:pageId",
  optionalAuthenticate,
  NetworkingController.getIncubatorDetail,
);

NetworkingRouter.get(
  "/networking/incubator-programs",
  optionalAuthenticate,
  NetworkingController.discoverIncubatorPrograms,
);

NetworkingRouter.get(
  "/networking/incubator-programs/:programId",
  optionalAuthenticate,
  NetworkingController.getProgramDetail,
);

NetworkingRouter.get(
  "/networking/startups",
  optionalAuthenticate,
  NetworkingController.discoverStartups,
);

NetworkingRouter.get(
  "/networking/startups/:pageId",
  optionalAuthenticate,
  NetworkingController.getStartupDetail,
);

NetworkingRouter.get(
  "/networking/pages",
  optionalAuthenticate,
  NetworkingController.discoverPages,
);

NetworkingRouter.get(
  "/networking/my-network",
  authenticate,
  NetworkingController.getMyNetwork,
);

NetworkingRouter.get(
  "/networking/suggestions",
  authenticate,
  NetworkingController.getSuggestions,
);

NetworkingRouter.post(
  "/networking/:matchType/:targetId/save",
  authenticate,
  NetworkingController.saveProfile,
);

NetworkingRouter.delete(
  "/networking/:matchType/:targetId/save",
  authenticate,
  NetworkingController.unsaveProfile,
);

NetworkingRouter.post(
  "/networking/:matchType/:targetId/dismiss",
  authenticate,
  NetworkingController.dismissProfile,
);

NetworkingRouter.get(
  "/networking/saved",
  authenticate,
  NetworkingController.getSavedProfiles,
);

export default NetworkingRouter;
