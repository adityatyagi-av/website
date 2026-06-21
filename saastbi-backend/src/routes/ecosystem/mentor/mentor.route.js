import { Router } from "express";
import {
  authenticate,
  optionalAuthenticate,
} from "../../../middlewares/auth.middleware.js";
import { EcosystemMentorController } from "../../../controllers/ecosystem/mentor/mentor.controller.js";
import {
  EcosystemMentorValidation,
  validate,
} from "../../../validators/ecosystem/mentor.validator.js";

const EcosystemMentorRouter = Router();

EcosystemMentorRouter.get(
  "/mentors",
  optionalAuthenticate,
  validate(EcosystemMentorValidation.discoverMentors),
  EcosystemMentorController.discoverMentors
);

EcosystemMentorRouter.get(
  "/mentors/featured",
  EcosystemMentorController.getFeaturedMentors
);

EcosystemMentorRouter.get(
  "/mentors/recommended",
  authenticate,
  EcosystemMentorController.getRecommendedMentors
);

EcosystemMentorRouter.get(
  "/mentors/incubator",
  authenticate,
  EcosystemMentorController.getIncubatorMentors
);

EcosystemMentorRouter.get(
  "/mentor/:mentorId",
  EcosystemMentorController.getMentorProfile
);

EcosystemMentorRouter.get(
  "/mentor/:mentorId/session-types",
  validate(EcosystemMentorValidation.getMentorById),
  EcosystemMentorController.getMentorSessionTypes
);

EcosystemMentorRouter.get(
  "/mentor/:mentorId/packages",
  validate(EcosystemMentorValidation.getMentorById),
  EcosystemMentorController.getMentorPackages
);

EcosystemMentorRouter.get(
  "/mentor/:mentorId/availability",
  validate(EcosystemMentorValidation.getMentorAvailability),
  EcosystemMentorController.getMentorAvailability
);

EcosystemMentorRouter.get(
  "/mentor/:mentorId/reviews",
  validate(EcosystemMentorValidation.getMentorReviews),
  EcosystemMentorController.getMentorReviews
);

EcosystemMentorRouter.post(
  "/mentor/:mentorId/book",
  authenticate,
  validate(EcosystemMentorValidation.bookSession),
  EcosystemMentorController.bookSession
);

EcosystemMentorRouter.post(
  "/session/:sessionId/confirm-payment",
  authenticate,
  validate(EcosystemMentorValidation.confirmPayment),
  EcosystemMentorController.confirmSessionPayment
);

EcosystemMentorRouter.get(
  "/my-sessions",
  authenticate,
  validate(EcosystemMentorValidation.listSessions),
  EcosystemMentorController.getMySessions
);

EcosystemMentorRouter.get(
  "/session/:sessionId",
  authenticate,
  validate(EcosystemMentorValidation.getSessionById),
  EcosystemMentorController.getSessionById
);

EcosystemMentorRouter.patch(
  "/session/:sessionId/cancel",
  authenticate,
  validate(EcosystemMentorValidation.cancelSession),
  EcosystemMentorController.cancelSession
);

EcosystemMentorRouter.patch(
  "/session/:sessionId/reschedule",
  authenticate,
  validate(EcosystemMentorValidation.rescheduleSession),
  EcosystemMentorController.rescheduleSession
);

EcosystemMentorRouter.post(
  "/session/:sessionId/review",
  authenticate,
  validate(EcosystemMentorValidation.submitReview),
  EcosystemMentorController.submitReview
);

EcosystemMentorRouter.get(
  "/session/:sessionId/video/join",
  authenticate,
  validate(EcosystemMentorValidation.getSessionById),
  EcosystemMentorController.getVideoJoinInfo
);

EcosystemMentorRouter.post(
  "/package/:packageId/subscribe",
  authenticate,
  validate(EcosystemMentorValidation.subscribeToPackage),
  EcosystemMentorController.subscribeToPackage
);

EcosystemMentorRouter.post(
  "/package-subscription/:subscriptionId/confirm-payment",
  authenticate,
  validate(EcosystemMentorValidation.confirmPackagePayment),
  EcosystemMentorController.confirmPackagePayment
);

EcosystemMentorRouter.get(
  "/my-packages",
  authenticate,
  validate(EcosystemMentorValidation.listPackages),
  EcosystemMentorController.getMyPackages
);

EcosystemMentorRouter.post(
  "/mentor/:mentorId/mentorship",
  authenticate,
  validate(EcosystemMentorValidation.requestMentorship),
  EcosystemMentorController.requestMentorship
);

EcosystemMentorRouter.get(
  "/my-mentorships",
  authenticate,
  validate(EcosystemMentorValidation.listMentorships),
  EcosystemMentorController.getMyMentorships
);

EcosystemMentorRouter.get(
  "/mentorship/:mentorshipId",
  authenticate,
  validate(EcosystemMentorValidation.getMentorshipById),
  EcosystemMentorController.getMentorshipById
);

EcosystemMentorRouter.post(
  "/mentorship/:mentorshipId/end",
  authenticate,
  validate(EcosystemMentorValidation.endMentorship),
  EcosystemMentorController.endMentorship
);

EcosystemMentorRouter.get(
  "/mentor-spending",
  authenticate,
  EcosystemMentorController.getMentorSpending
);

EcosystemMentorRouter.post(
  "/mentor/:mentorId/save",
  authenticate,
  validate(EcosystemMentorValidation.saveMentor),
  EcosystemMentorController.saveMentor
);

EcosystemMentorRouter.delete(
  "/mentor/:mentorId/save",
  authenticate,
  validate(EcosystemMentorValidation.saveMentor),
  EcosystemMentorController.unsaveMentor
);

EcosystemMentorRouter.get(
  "/saved-mentors",
  authenticate,
  EcosystemMentorController.getSavedMentors
);

export default EcosystemMentorRouter;
