import { Router } from "express";
import { authenticate, optionalAuthenticate, authorizeRoles } from "../../middlewares/auth.middleware.js";
import { MentorProfileController } from "../../controllers/mentor/profile.controller.js";
import { SessionTypeController } from "../../controllers/mentor/session-type.controller.js";
import { AvailabilityController } from "../../controllers/mentor/availability.controller.js";
import { SessionController } from "../../controllers/mentor/session.controller.js";
import { PackageController } from "../../controllers/mentor/package.controller.js";
import { MentorshipController } from "../../controllers/mentor/mentorship.controller.js";
import { IncubatorAssociationController } from "../../controllers/mentor/incubator-association.controller.js";
import { EarningsController } from "../../controllers/mentor/earnings.controller.js";
import { DashboardController } from "../../controllers/mentor/dashboard.controller.js";
import { VideoController } from "../../controllers/mentor/video.controller.js";
import { MentorAnnouncementController } from "../../controllers/mentor/announcement.controller.js";
import { MentorProfileValidation, validate } from "../../validators/mentor/profile.validator.js";
import { SessionTypeValidation } from "../../validators/mentor/session-type.validator.js";
import { AvailabilityValidation } from "../../validators/mentor/availability.validator.js";
import { SessionValidation } from "../../validators/mentor/session.validator.js";
import { PackageValidation } from "../../validators/mentor/package.validator.js";
import { MentorshipValidation } from "../../validators/mentor/mentorship.validator.js";
import { IncubatorAssociationValidation } from "../../validators/mentor/incubator-association.validator.js";
import { EarningsValidation } from "../../validators/mentor/earnings.validator.js";

const MentorRouter = Router();
const authorizeMentor = authorizeRoles("MENTOR");


MentorRouter.get(
  "/mentors",
  optionalAuthenticate,
  validate(MentorProfileValidation.discoverMentors),
  MentorProfileController.discoverMentors
);

MentorRouter.get("/mentors/featured", MentorProfileController.getFeaturedMentors);


MentorRouter.get(
  "/mentor/:mentorId/reviews",
  validate(MentorProfileValidation.getMentorById),
  MentorProfileController.getMentorReviews
);

MentorRouter.get(
  "/mentor/:mentorId/session-types",
  validate(SessionTypeValidation.getByMentor),
  SessionTypeController.getByMentor
);

MentorRouter.get(
  "/mentor/:mentorId/packages",
  validate(PackageValidation.getByMentor),
  PackageController.getByMentor
);

MentorRouter.get(
  "/mentor/:mentorId/available-slots",
  validate(AvailabilityValidation.getAvailableSlots),
  AvailabilityController.getAvailableSlots
);

MentorRouter.get(
  "/mentor/:mentorId/quick-availability",
  AvailabilityController.getQuickAvailability
);

MentorRouter.get(
  "/mentor/:mentorId/calendar-availability",
  validate(AvailabilityValidation.getCalendarAvailability),
  AvailabilityController.getCalendarAvailability
);

MentorRouter.post(
  "/mentor/profile",
  authenticate,
  validate(MentorProfileValidation.createProfile),
  MentorProfileController.createProfile
);


MentorRouter.get("/mentor/profile", authenticate, MentorProfileController.getOwnProfile);

MentorRouter.put(
  "/mentor/profile",
  authenticate,
  authorizeMentor,
  validate(MentorProfileValidation.updateProfile),
  MentorProfileController.updateProfile
);

MentorRouter.patch(
  "/mentor/profile/visibility",
  authenticate,
  authorizeMentor,
  validate(MentorProfileValidation.updateVisibility),
  MentorProfileController.updateVisibility
);

MentorRouter.get("/mentor/profile/stats", authenticate, authorizeMentor, MentorProfileController.getProfileStats);

MentorRouter.post(
  "/mentor/session-types",
  authenticate,
  authorizeMentor,
  validate(SessionTypeValidation.create),
  SessionTypeController.create
);

MentorRouter.get("/mentor/session-types", authenticate, authorizeMentor, SessionTypeController.getOwn);

MentorRouter.put(
  "/mentor/session-types/:sessionTypeId",
  authenticate,
  validate(SessionTypeValidation.update),
  SessionTypeController.update
);

MentorRouter.delete(
  "/mentor/session-types/:sessionTypeId",
  authenticate,
  validate(SessionTypeValidation.delete),
  SessionTypeController.delete
);

MentorRouter.patch(
  "/mentor/session-types/:sessionTypeId/toggle",
  authenticate,
  authorizeMentor,
  validate(SessionTypeValidation.toggle),
  SessionTypeController.toggle
);

MentorRouter.get("/mentor/availability", authenticate, authorizeMentor, AvailabilityController.getOwn);

MentorRouter.get("/mentor/availability/quick", authenticate, authorizeMentor, AvailabilityController.getOwnQuickAvailability);

MentorRouter.put(
  "/mentor/availability",
  authenticate,
  authorizeMentor,
  validate(AvailabilityValidation.setAvailability),
  AvailabilityController.setAvailability
);

MentorRouter.post(
  "/mentor/:mentorId/book",
  authenticate,
  validate(SessionValidation.book),
  SessionController.book
);

MentorRouter.get(
  "/mentor/sessions",
  authenticate,
  authorizeMentor,
  validate(SessionValidation.list),
  SessionController.getMentorSessions
);

MentorRouter.get("/mentor/sessions/pending", authenticate, authorizeMentor, (req, res, next) => {
  req.query.status = "PENDING";
  next();
}, SessionController.getMentorSessions);

MentorRouter.patch(
  "/mentor/session/:sessionId/confirm",
  authenticate,
  authorizeMentor,
  validate(SessionValidation.confirm),
  SessionController.confirm
);

MentorRouter.patch(
  "/mentor/session/:sessionId/decline",
  authenticate,
  authorizeMentor,
  validate(SessionValidation.decline),
  SessionController.decline
);

MentorRouter.patch(
  "/mentor/session/:sessionId/cancel",
  authenticate,
  authorizeMentor,
  validate(SessionValidation.cancel),
  SessionController.cancelAsMentor
);

MentorRouter.patch(
  "/mentor/session/:sessionId/reschedule",
  authenticate,
  authorizeMentor,
  validate(SessionValidation.reschedule),
  SessionController.reschedule
);

MentorRouter.put(
  "/mentor/session/:sessionId/notes",
  authenticate,
  authorizeMentor,
  validate(SessionValidation.updateNotes),
  SessionController.updateNotes
);

MentorRouter.patch(
  "/mentor/session/:sessionId/complete",
  authenticate,
  authorizeMentor,
  validate(SessionValidation.complete),
  SessionController.complete
);

MentorRouter.post(
  "/mentor/session/:sessionId/extend",
  authenticate,
  authorizeMentor,
  validate(SessionValidation.extend),
  SessionController.extend
);

MentorRouter.get(
  "/mentor/session/:sessionId",
  authenticate,
  authorizeMentor,
  validate(SessionValidation.getById),
  SessionController.getById
);

MentorRouter.post(
  "/mentor/session/:sessionId/no-show",
  authenticate,
  authorizeMentor,
  validate(SessionValidation.markNoShow),
  SessionController.markNoShow
);

MentorRouter.post(
  "/mentor/packages",
  authenticate,
  authorizeMentor,
  validate(PackageValidation.create),
  PackageController.create
);

MentorRouter.get("/mentor/packages", authenticate, authorizeMentor, PackageController.getOwn);

MentorRouter.put(
  "/mentor/packages/:packageId",
  authenticate,
  validate(PackageValidation.update),
  PackageController.update
);

MentorRouter.delete(
  "/mentor/packages/:packageId",
  authenticate,
  validate(PackageValidation.delete),
  PackageController.delete
);

MentorRouter.get(
  "/mentor/packages/:packageId/subscribers",
  authenticate,
  authorizeMentor,
  PackageController.getPackageSubscribers
);

MentorRouter.get(
  "/mentor/mentorships",
  authenticate,
  authorizeMentor,
  validate(MentorshipValidation.list),
  MentorshipController.getMentorMentorships
);

MentorRouter.post(
  "/mentor/mentorship/:mentorshipId/accept",
  authenticate,
  authorizeMentor,
  validate(MentorshipValidation.accept),
  MentorshipController.accept
);

MentorRouter.patch(
  "/mentor/mentorship/:mentorshipId/status",
  authenticate,
  authorizeMentor,
  validate(MentorshipValidation.updateStatus),
  MentorshipController.updateStatus
);

MentorRouter.post(
  "/mentor/mentorship/:mentorshipId/end",
  authenticate,
  authorizeMentor,
  validate(MentorshipValidation.end),
  MentorshipController.end
);

MentorRouter.get(
  "/mentor/mentorship/:mentorshipId",
  authenticate,
  authorizeMentor,
  validate(MentorshipValidation.getById),
  MentorshipController.getById
);

MentorRouter.post(
  "/mentor/mentorship/:mentorshipId/milestone",
  authenticate,
  authorizeMentor,
  validate(MentorshipValidation.addMilestone),
  MentorshipController.addMilestone
);

MentorRouter.put(
  "/mentor/milestone/:milestoneId",
  authenticate,
  validate(MentorshipValidation.updateMilestone),
  MentorshipController.updateMilestone
);

MentorRouter.delete(
  "/mentor/milestone/:milestoneId",
  authenticate,
  validate(MentorshipValidation.deleteMilestone),
  MentorshipController.deleteMilestone
);

MentorRouter.get(
  "/mentor/mentorship/:mentorshipId/milestones",
  authenticate,
  authorizeMentor,
  MentorshipController.getMilestones
);

MentorRouter.get(
  "/mentor/incubators",
  authenticate,
  authorizeMentor,
  validate(IncubatorAssociationValidation.list),
  IncubatorAssociationController.getMentorAssociations
);

MentorRouter.get(
  "/mentor/incubator-associations",
  authenticate,
  authorizeMentor,
  validate(IncubatorAssociationValidation.list),
  IncubatorAssociationController.getMentorAssociations
);

MentorRouter.get(
  "/mentor/incubators/available",
  authenticate,
  authorizeMentor,
  IncubatorAssociationController.getAvailableIncubators
);

MentorRouter.post(
  "/mentor/incubator/:tenantId/apply",
  authenticate,
  authorizeMentor,
  validate(IncubatorAssociationValidation.apply),
  IncubatorAssociationController.apply
);

MentorRouter.patch(
  "/mentor/incubator-association/:associationId/respond",
  authenticate,
  authorizeMentor,
  validate(IncubatorAssociationValidation.respond),
  IncubatorAssociationController.respond
);

MentorRouter.post(
  "/mentor/incubator-association/:associationId/end",
  authenticate,
  authorizeMentor,
  validate(IncubatorAssociationValidation.end),
  IncubatorAssociationController.endAsMentor
);

MentorRouter.get(
  "/mentor/incubator-association/:associationId/usage",
  authenticate,
  authorizeMentor,
  validate(IncubatorAssociationValidation.getUsage),
  IncubatorAssociationController.getUsage
);

MentorRouter.get("/mentor/earnings", authenticate, authorizeMentor, EarningsController.getSummary);

MentorRouter.get(
  "/mentor/earnings/history",
  authenticate,
  authorizeMentor,
  validate(EarningsValidation.list),
  EarningsController.getHistory
);

MentorRouter.get("/mentor/earnings/pending", authenticate, authorizeMentor, EarningsController.getPending);

MentorRouter.get("/mentor/earnings/analytics", authenticate, authorizeMentor, EarningsController.getEarningsAnalytics);

MentorRouter.post(
  "/mentor/withdraw",
  authenticate,
  authorizeMentor,
  validate(EarningsValidation.withdraw),
  EarningsController.withdraw
);

MentorRouter.get(
  "/mentor/withdrawals",
  authenticate,
  authorizeMentor,
  validate(EarningsValidation.withdrawalList),
  EarningsController.getWithdrawals
);

MentorRouter.post(
  "/mentor/payout-account",
  authenticate,
  authorizeMentor,
  validate(EarningsValidation.addPayoutAccount),
  EarningsController.addPayoutAccount
);

MentorRouter.get("/mentor/payout-accounts", authenticate, authorizeMentor, EarningsController.getPayoutAccounts);

MentorRouter.delete(
  "/mentor/payout-account/:accountId",
  authenticate,
  authorizeMentor,
  validate(EarningsValidation.deletePayoutAccount),
  EarningsController.deletePayoutAccount
);

MentorRouter.get("/mentor/dashboard", authenticate, authorizeMentor, DashboardController.getOverview);

MentorRouter.get("/mentor/analytics/sessions", authenticate, authorizeMentor, DashboardController.getSessionAnalytics);

MentorRouter.get("/mentor/analytics/earnings", authenticate, authorizeMentor, DashboardController.getEarningsAnalytics);

MentorRouter.get("/mentor/analytics/reviews", authenticate, authorizeMentor, DashboardController.getReviewAnalytics);

MentorRouter.get("/mentor/analytics/mentees", authenticate, authorizeMentor, DashboardController.getMenteeAnalytics);

MentorRouter.get(
  "/mentor/session/:sessionId/video/join",
  authenticate,
  authorizeMentor,
  VideoController.getJoinInfo
);

MentorRouter.post(
  "/mentor/session/:sessionId/video/start",
  authenticate,
  authorizeMentor,
  VideoController.startSession
);

MentorRouter.post(
  "/mentor/session/:sessionId/video/end",
  authenticate,
  authorizeMentor,
  VideoController.endSession
);

MentorRouter.post(
  "/mentor/session/:sessionId/recording/start",
  authenticate,
  authorizeMentor,
  VideoController.startRecording
);

MentorRouter.post(
  "/mentor/session/:sessionId/recording/stop",
  authenticate,
  authorizeMentor,
  VideoController.stopRecording
);

MentorRouter.get(
  "/mentor/session/:sessionId/recordings",
  authenticate,
  authorizeMentor,
  VideoController.getRecordings
);

MentorRouter.get(
  "/mentor/announcements",
  authenticate,
  authorizeMentor,
  MentorAnnouncementController.getReceivedAnnouncements
);

MentorRouter.get(
  "/mentor/announcements/unread-count",
  authenticate,
  authorizeMentor,
  MentorAnnouncementController.getUnreadCount
);

MentorRouter.get(
  "/mentor/announcements/:id",
  authenticate,
  authorizeMentor,
  MentorAnnouncementController.getReceivedAnnouncementById
);

MentorRouter.patch(
  "/mentor/announcements/:id/read",
  authenticate,
  authorizeMentor,
  MentorAnnouncementController.markAsRead
);

MentorRouter.get(
  "/mentor/incubator/:incubatorId/announcements",
  authenticate,
  authorizeMentor,
  MentorAnnouncementController.getAnnouncementsByIncubator
);

MentorRouter.get(
  "/mentor/:mentorId",
  optionalAuthenticate,
  validate(MentorProfileValidation.getMentorById),
  MentorProfileController.getPublicProfile
);

export default MentorRouter;
