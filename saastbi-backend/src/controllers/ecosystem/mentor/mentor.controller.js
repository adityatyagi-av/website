import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";
import { EcosystemMentorService } from "../../../services/ecosystem/mentor/mentor.service.js";

export const EcosystemMentorController = {
  discoverMentors: asyncHandler(async (req, res) => {
    const result = await EcosystemMentorService.discoverMentors(
      req.user?.id,
      req.query
    );
    return apiResponse.sendSuccess(res, result);
  }),

  getMentorProfile: asyncHandler(async (req, res) => {
    const { mentorId } = req.params;
    const profile = await EcosystemMentorService.getMentorProfile(
      mentorId,
      req.user?.id
    );
    return apiResponse.sendSuccess(res, profile);
  }),

  getMentorSessionTypes: asyncHandler(async (req, res) => {
    const { mentorId } = req.params;
    const sessionTypes =
      await EcosystemMentorService.getMentorSessionTypes(mentorId);
    return apiResponse.sendSuccess(res, sessionTypes);
  }),

  getMentorPackages: asyncHandler(async (req, res) => {
    const { mentorId } = req.params;
    const packages =
      await EcosystemMentorService.getMentorPackages(mentorId);
    return apiResponse.sendSuccess(res, packages);
  }),

  getMentorAvailability: asyncHandler(async (req, res) => {
    const { mentorId } = req.params;
    const { date, sessionTypeId } = req.query;
    const slots = await EcosystemMentorService.getMentorAvailability(
      mentorId,
      date,
      sessionTypeId
    );
    return apiResponse.sendSuccess(res, slots);
  }),

  getMentorReviews: asyncHandler(async (req, res) => {
    const { mentorId } = req.params;
    const reviews = await EcosystemMentorService.getMentorReviews(
      mentorId,
      req.query
    );
    return apiResponse.sendSuccess(res, reviews);
  }),

  bookSession: asyncHandler(async (req, res) => {
    const { mentorId } = req.params;
    const session = await EcosystemMentorService.bookSession(
      req.user.id,
      mentorId,
      req.body
    );
    return apiResponse.sendSuccess(res, session, "Session booking initiated", 201);
  }),

  confirmSessionPayment: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const session = await EcosystemMentorService.confirmSessionPayment(
      req.user.id,
      sessionId,
      req.body
    );
    return apiResponse.sendSuccess(res, session, "Payment confirmed");
  }),

  getMySessions: asyncHandler(async (req, res) => {
    const result = await EcosystemMentorService.getSessions(
      req.user.id,
      req.query
    );
    return apiResponse.sendSuccess(res, result);
  }),

  getSessionById: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const session = await EcosystemMentorService.getSessionById(
      req.user.id,
      sessionId
    );
    return apiResponse.sendSuccess(res, session);
  }),

  cancelSession: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { reason } = req.body;
    const session = await EcosystemMentorService.cancelSession(
      req.user.id,
      sessionId,
      reason
    );
    return apiResponse.sendSuccess(res, session, "Session cancelled");
  }),

  rescheduleSession: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const session = await EcosystemMentorService.rescheduleSession(
      req.user.id,
      sessionId,
      req.body
    );
    return apiResponse.sendSuccess(res, session, "Reschedule request sent");
  }),

  submitReview: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const review = await EcosystemMentorService.submitReview(
      req.user.id,
      sessionId,
      req.body
    );
    return apiResponse.sendSuccess(res, review, "Review submitted", 201);
  }),

  subscribeToPackage: asyncHandler(async (req, res) => {
    const { packageId } = req.params;
    const subscription = await EcosystemMentorService.subscribeToPackage(
      req.user.id,
      packageId,
      req.body
    );
    return apiResponse.sendSuccess(
      res,
      subscription,
      "Package subscription initiated",
      201
    );
  }),

  confirmPackagePayment: asyncHandler(async (req, res) => {
    const { subscriptionId } = req.params;
    const subscription = await EcosystemMentorService.confirmPackagePayment(
      req.user.id,
      subscriptionId,
      req.body
    );
    return apiResponse.sendSuccess(res, subscription, "Payment confirmed");
  }),

  getMyPackages: asyncHandler(async (req, res) => {
    const packages = await EcosystemMentorService.getPackages(
      req.user.id,
      req.query
    );
    return apiResponse.sendSuccess(res, packages);
  }),

  requestMentorship: asyncHandler(async (req, res) => {
    const { mentorId } = req.params;
    const mentorship = await EcosystemMentorService.requestMentorship(
      req.user.id,
      mentorId,
      req.body
    );
    return apiResponse.sendSuccess(
      res,
      mentorship,
      "Mentorship request sent",
      201
    );
  }),

  getMyMentorships: asyncHandler(async (req, res) => {
    const result = await EcosystemMentorService.getMentorships(
      req.user.id,
      req.query
    );
    return apiResponse.sendSuccess(res, result);
  }),

  getMentorshipById: asyncHandler(async (req, res) => {
    const { mentorshipId } = req.params;
    const mentorship = await EcosystemMentorService.getMentorshipById(
      req.user.id,
      mentorshipId
    );
    return apiResponse.sendSuccess(res, mentorship);
  }),

  endMentorship: asyncHandler(async (req, res) => {
    const { mentorshipId } = req.params;
    const { reason } = req.body;
    const mentorship = await EcosystemMentorService.endMentorship(
      req.user.id,
      mentorshipId,
      reason
    );
    return apiResponse.sendSuccess(res, mentorship, "Mentorship ended");
  }),

  getVideoJoinInfo: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const joinInfo = await EcosystemMentorService.getVideoJoinInfo(
      req.user.id,
      sessionId
    );
    return apiResponse.sendSuccess(res, joinInfo);
  }),

  getFeaturedMentors: asyncHandler(async (req, res) => {
    const mentors = await EcosystemMentorService.getFeaturedMentors(req.query);
    return apiResponse.sendSuccess(res, mentors);
  }),

  getRecommendedMentors: asyncHandler(async (req, res) => {
    const mentors = await EcosystemMentorService.getRecommendedMentors(
      req.user.id,
      req.query
    );
    return apiResponse.sendSuccess(res, mentors);
  }),

  getIncubatorMentors: asyncHandler(async (req, res) => {
    const { startupId } = req.query;
    if (!startupId) {
      return apiResponse.sendError(res, "startupId is required", 400);
    }
    const result = await EcosystemMentorService.getIncubatorMentors(
      req.user.id,
      startupId,
      req.query
    );
    return apiResponse.sendSuccess(res, result);
  }),

  getMentorSpending: asyncHandler(async (req, res) => {
    const { startupId } = req.query;
    if (!startupId) {
      return apiResponse.sendError(res, "startupId is required", 400);
    }
    const spending = await EcosystemMentorService.getMentorSpending(
      req.user.id,
      startupId,
      req.query
    );
    return apiResponse.sendSuccess(res, spending);
  }),

  saveMentor: asyncHandler(async (req, res) => {
    const { mentorId } = req.params;
    await EcosystemMentorService.saveMentor(req.user.id, mentorId);
    return apiResponse.sendSuccess(res, null, "Mentor saved");
  }),

  unsaveMentor: asyncHandler(async (req, res) => {
    const { mentorId } = req.params;
    await EcosystemMentorService.unsaveMentor(req.user.id, mentorId);
    return apiResponse.sendSuccess(res, null, "Mentor removed from saved");
  }),

  getSavedMentors: asyncHandler(async (req, res) => {
    const mentors = await EcosystemMentorService.getSavedMentors(
      req.user.id,
      req.query
    );
    return apiResponse.sendSuccess(res, mentors);
  }),
};
