import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";
import { EventService } from "../../../services/ecosystem/event/event.service.js";
import { EventRegistrationService } from "../../../services/ecosystem/event/event-registration.service.js";
import { EventManagementService } from "../../../services/ecosystem/event/event-management.service.js";
import { EventSocialService } from "../../../services/ecosystem/event/event-social.service.js";
import { EventLiveService } from "../../../services/ecosystem/event/event-live.service.js";
import { EventScoringService } from "../../../services/ecosystem/event/event-scoring.service.js";

export const EventController = {
  createEvent: asyncHandler(async (req, res) => {
    const result = await EventService.createEvent(req.user.id, req.body);
    return apiResponse.sendCreated(res, result, "Event created successfully");
  }),

  updateEvent: asyncHandler(async (req, res) => {
    const result = await EventService.updateEvent(
      req.user.id,
      req.params.eventId,
      req.body,
    );
    return apiResponse.sendUpdated(res, result, "Event updated successfully");
  }),

  updateRecurringEvents: asyncHandler(async (req, res) => {
    const result = await EventService.updateRecurringEvents(
      req.user.id,
      req.params.eventId,
      req.body,
      req.query.mode,
    );
    return apiResponse.sendUpdated(res, result, "Recurring events updated");
  }),

  publishEvent: asyncHandler(async (req, res) => {
    const result = await EventService.publishEvent(
      req.user.id,
      req.params.eventId,
    );
    return apiResponse.sendSuccess(res, result, "Event published successfully");
  }),

  cancelEvent: asyncHandler(async (req, res) => {
    const result = await EventService.cancelEvent(
      req.user.id,
      req.params.eventId,
      req.body.reason,
    );
    return apiResponse.sendSuccess(res, result, "Event cancelled");
  }),

  completeEvent: asyncHandler(async (req, res) => {
    const result = await EventService.completeEvent(
      req.user.id,
      req.params.eventId,
    );
    return apiResponse.sendSuccess(res, result, "Event marked as completed");
  }),

  deleteEvent: asyncHandler(async (req, res) => {
    const result = await EventService.deleteEvent(
      req.user.id,
      req.params.eventId,
    );
    return apiResponse.sendDeleted(res, result, "Event deleted");
  }),

  getEventBySlug: asyncHandler(async (req, res) => {
    const result = await EventService.getEventBySlug(
      req.params.slug,
      req.user?.id,
      req,
    );
    return apiResponse.sendSuccess(res, result, "Event fetched successfully");
  }),

  getEventById: asyncHandler(async (req, res) => {
    const result = await EventService.getEventById(req.params.eventId);
    return apiResponse.sendSuccess(res, result, "Event fetched successfully");
  }),

  getAllEvents: asyncHandler(async (req, res) => {
    const result = await EventService.getAllEvents(req.query, req.user?.id);
    return apiResponse.sendSuccess(res, result, "Events fetched successfully");
  }),

  getMyEvents: asyncHandler(async (req, res) => {
    const result = await EventService.getMyEvents(req.user.id, req.query);
    return apiResponse.sendSuccess(res, result, "My events fetched");
  }),

  getHostingEvents: asyncHandler(async (req, res) => {
    const result = await EventService.getHostingEvents(req.user.id, req.query);
    return apiResponse.sendSuccess(res, result, "Hosting events fetched");
  }),

  getLiveNow: asyncHandler(async (req, res) => {
    const result = await EventService.getLiveNow(req.query);
    return apiResponse.sendSuccess(res, result, "Live events fetched");
  }),

  getUpcomingThisWeek: asyncHandler(async (req, res) => {
    const result = await EventService.getUpcomingThisWeek();
    return apiResponse.sendSuccess(res, result, "Upcoming events fetched");
  }),

  getTrendingEvents: asyncHandler(async (req, res) => {
    const result = await EventService.getTrendingEvents(req.query);
    return apiResponse.sendSuccess(res, result, "Trending events fetched");
  }),

  getPopularCategories: asyncHandler(async (req, res) => {
    const result = await EventService.getPopularCategories();
    return apiResponse.sendSuccess(res, result, "Popular categories fetched");
  }),

  getEventsByPage: asyncHandler(async (req, res) => {
    const result = await EventService.getEventsByPage(
      req.params.pageId,
      req.query,
    );
    return apiResponse.sendSuccess(res, result, "Page events fetched");
  }),

  duplicateEvent: asyncHandler(async (req, res) => {
    const result = await EventService.duplicateEvent(
      req.user.id,
      req.params.eventId,
    );
    return apiResponse.sendCreated(res, result, "Event duplicated");
  }),

  getRecommendedEvents: asyncHandler(async (req, res) => {
    const result = await EventScoringService.getRecommendedEvents(
      req.user.id,
      req.query,
    );
    return apiResponse.sendSuccess(res, result, "Recommended events fetched");
  }),

  createTicketType: asyncHandler(async (req, res) => {
    const result = await EventService.createTicketType(
      req.user.id,
      req.params.eventId,
      req.body,
    );
    return apiResponse.sendCreated(res, result, "Ticket type created");
  }),

  updateTicketType: asyncHandler(async (req, res) => {
    const result = await EventService.updateTicketType(
      req.user.id,
      req.params.ticketTypeId,
      req.body,
    );
    return apiResponse.sendUpdated(res, result, "Ticket type updated");
  }),

  deleteTicketType: asyncHandler(async (req, res) => {
    const result = await EventService.deleteTicketType(
      req.user.id,
      req.params.ticketTypeId,
    );
    return apiResponse.sendDeleted(res, result, "Ticket type deleted");
  }),

  getAvailableTickets: asyncHandler(async (req, res) => {
    const result = await EventService.getAvailableTickets(req.params.eventId);
    return apiResponse.sendSuccess(res, result, "Tickets fetched");
  }),

  registerForEvent: asyncHandler(async (req, res) => {
    const result = await EventRegistrationService.registerForEvent(
      req.user.id,
      req.params.eventId,
      req.body,
    );
    return apiResponse.sendCreated(res, result, "Registered for event");
  }),

  verifyPayment: asyncHandler(async (req, res) => {
    const result = await EventRegistrationService.verifyPayment(
      req.user.id,
      req.params.eventId,
      req.body,
    );
    return apiResponse.sendSuccess(res, result, "Payment verified");
  }),

  cancelRegistration: asyncHandler(async (req, res) => {
    const result = await EventRegistrationService.cancelRegistration(
      req.user.id,
      req.params.eventId,
      req.body.reason,
    );
    return apiResponse.sendSuccess(res, result, "Registration cancelled");
  }),

  getRegistrationStatus: asyncHandler(async (req, res) => {
    const result = await EventRegistrationService.getRegistrationStatus(
      req.user.id,
      req.params.eventId,
    );
    return apiResponse.sendSuccess(res, result, "Registration status fetched");
  }),

  getRegistrations: asyncHandler(async (req, res) => {
    const result = await EventRegistrationService.getRegistrations(
      req.user.id,
      req.params.eventId,
      req.query,
    );
    return apiResponse.sendSuccess(res, result, "Registrations fetched");
  }),

  approveRegistrations: asyncHandler(async (req, res) => {
    const result = await EventRegistrationService.approveRegistrations(
      req.user.id,
      req.params.eventId,
      req.body.registrationIds,
    );
    return apiResponse.sendSuccess(res, result, "Registrations approved");
  }),

  rejectRegistrations: asyncHandler(async (req, res) => {
    const result = await EventRegistrationService.rejectRegistrations(
      req.user.id,
      req.params.eventId,
      req.body.registrationIds,
      req.body.rejectionNote,
    );
    return apiResponse.sendSuccess(res, result, "Registrations rejected");
  }),

  promoteFromWaitlist: asyncHandler(async (req, res) => {
    const result = await EventRegistrationService.promoteFromWaitlist(
      req.user.id,
      req.params.eventId,
      req.body.count,
    );
    return apiResponse.sendSuccess(res, result, "Waitlist promoted");
  }),

  checkIn: asyncHandler(async (req, res) => {
    const result = await EventRegistrationService.checkIn(
      req.user.id,
      req.params.eventId,
      req.body.registrationId,
    );
    return apiResponse.sendSuccess(res, result, "Checked in");
  }),

  bulkCheckIn: asyncHandler(async (req, res) => {
    const result = await EventRegistrationService.bulkCheckIn(
      req.user.id,
      req.params.eventId,
      req.body.registrationIds,
    );
    return apiResponse.sendSuccess(res, result, "Bulk check-in completed");
  }),

  exportRegistrations: asyncHandler(async (req, res) => {
    const result = await EventRegistrationService.exportRegistrations(
      req.user.id,
      req.params.eventId,
    );
    return apiResponse.sendSuccess(res, result, "Export ready");
  }),

  getRegistrationSummary: asyncHandler(async (req, res) => {
    const result = await EventRegistrationService.getRegistrationSummary(
      req.user.id,
      req.params.eventId,
    );
    return apiResponse.sendSuccess(res, result, "Summary fetched");
  }),

  getUserRegistrations: asyncHandler(async (req, res) => {
    const result = await EventRegistrationService.getUserRegistrations(
      req.user.id,
      req.query,
    );
    return apiResponse.sendSuccess(res, result, "Your registrations fetched");
  }),

  addOrganizer: asyncHandler(async (req, res) => {
    const result = await EventManagementService.addOrganizer(
      req.user.id,
      req.params.eventId,
      req.body,
    );
    return apiResponse.sendCreated(res, result, "Organizer added");
  }),

  removeOrganizer: asyncHandler(async (req, res) => {
    const result = await EventManagementService.removeOrganizer(
      req.user.id,
      req.params.eventId,
      req.params.organizerId,
    );
    return apiResponse.sendDeleted(res, result, "Organizer removed");
  }),

  updateOrganizer: asyncHandler(async (req, res) => {
    const result = await EventManagementService.updateOrganizer(
      req.user.id,
      req.params.eventId,
      req.params.organizerId,
      req.body,
    );
    return apiResponse.sendUpdated(res, result, "Organizer updated");
  }),

  addSpeaker: asyncHandler(async (req, res) => {
    const result = await EventManagementService.addSpeaker(
      req.user.id,
      req.params.eventId,
      req.body,
    );
    return apiResponse.sendCreated(res, result, "Speaker added");
  }),

  updateSpeaker: asyncHandler(async (req, res) => {
    const result = await EventManagementService.updateSpeaker(
      req.user.id,
      req.params.eventId,
      req.params.speakerId,
      req.body,
    );
    return apiResponse.sendUpdated(res, result, "Speaker updated");
  }),

  removeSpeaker: asyncHandler(async (req, res) => {
    const result = await EventManagementService.removeSpeaker(
      req.user.id,
      req.params.eventId,
      req.params.speakerId,
    );
    return apiResponse.sendDeleted(res, result, "Speaker removed");
  }),

  addSponsor: asyncHandler(async (req, res) => {
    const result = await EventManagementService.addSponsor(
      req.user.id,
      req.params.eventId,
      req.body,
    );
    return apiResponse.sendCreated(res, result, "Sponsor added");
  }),

  updateSponsor: asyncHandler(async (req, res) => {
    const result = await EventManagementService.updateSponsor(
      req.user.id,
      req.params.eventId,
      req.params.sponsorId,
      req.body,
    );
    return apiResponse.sendUpdated(res, result, "Sponsor updated");
  }),

  removeSponsor: asyncHandler(async (req, res) => {
    const result = await EventManagementService.removeSponsor(
      req.user.id,
      req.params.eventId,
      req.params.sponsorId,
    );
    return apiResponse.sendDeleted(res, result, "Sponsor removed");
  }),

  addTimelineItem: asyncHandler(async (req, res) => {
    const result = await EventManagementService.addTimelineItem(
      req.user.id,
      req.params.eventId,
      req.body,
    );
    return apiResponse.sendCreated(res, result, "Timeline item added");
  }),

  updateTimelineItem: asyncHandler(async (req, res) => {
    const result = await EventManagementService.updateTimelineItem(
      req.user.id,
      req.params.eventId,
      req.params.timelineId,
      req.body,
    );
    return apiResponse.sendUpdated(res, result, "Timeline item updated");
  }),

  removeTimelineItem: asyncHandler(async (req, res) => {
    const result = await EventManagementService.removeTimelineItem(
      req.user.id,
      req.params.eventId,
      req.params.timelineId,
    );
    return apiResponse.sendDeleted(res, result, "Timeline item removed");
  }),

  addMedia: asyncHandler(async (req, res) => {
    const result = await EventManagementService.addMedia(
      req.user.id,
      req.params.eventId,
      req.body,
    );
    return apiResponse.sendCreated(res, result, "Media added");
  }),

  removeMedia: asyncHandler(async (req, res) => {
    const result = await EventManagementService.removeMedia(
      req.user.id,
      req.params.eventId,
      req.params.mediaId,
    );
    return apiResponse.sendDeleted(res, result, "Media removed");
  }),

  sendEventUpdate: asyncHandler(async (req, res) => {
    const result = await EventManagementService.sendEventUpdate(
      req.user.id,
      req.params.eventId,
      req.body,
    );
    return apiResponse.sendCreated(res, result, "Update sent");
  }),

  getEventUpdates: asyncHandler(async (req, res) => {
    const result = await EventManagementService.getEventUpdates(
      req.params.eventId,
      req.query,
    );
    return apiResponse.sendSuccess(res, result, "Updates fetched");
  }),

  getEventAnalytics: asyncHandler(async (req, res) => {
    const result = await EventManagementService.getEventAnalytics(
      req.user.id,
      req.params.eventId,
    );
    return apiResponse.sendSuccess(res, result, "Analytics fetched");
  }),

  bookmarkEvent: asyncHandler(async (req, res) => {
    const result = await EventSocialService.bookmarkEvent(
      req.user.id,
      req.params.eventId,
    );
    return apiResponse.sendCreated(res, result, "Event bookmarked");
  }),

  unbookmarkEvent: asyncHandler(async (req, res) => {
    const result = await EventSocialService.unbookmarkEvent(
      req.user.id,
      req.params.eventId,
    );
    return apiResponse.sendSuccess(res, result, "Bookmark removed");
  }),

  getSavedEvents: asyncHandler(async (req, res) => {
    const result = await EventSocialService.getSavedEvents(
      req.user.id,
      req.query,
    );
    return apiResponse.sendSuccess(res, result, "Saved events fetched");
  }),

  inviteToEvent: asyncHandler(async (req, res) => {
    const result = await EventSocialService.inviteToEvent(
      req.user.id,
      req.params.eventId,
      req.body,
    );
    return apiResponse.sendCreated(res, result, "Invitation sent");
  }),

  respondToInvitation: asyncHandler(async (req, res) => {
    const result = await EventSocialService.respondToInvitation(
      req.user.id,
      req.params.invitationId,
      req.body.response,
    );
    return apiResponse.sendSuccess(res, result, "Response recorded");
  }),

  getMyInvitations: asyncHandler(async (req, res) => {
    const result = await EventSocialService.getMyInvitations(
      req.user.id,
      req.query,
    );
    return apiResponse.sendSuccess(res, result, "Invitations fetched");
  }),

  submitFeedback: asyncHandler(async (req, res) => {
    const result = await EventSocialService.submitFeedback(
      req.user.id,
      req.params.eventId,
      req.body,
    );
    return apiResponse.sendCreated(res, result, "Feedback submitted");
  }),

  getEventFeedback: asyncHandler(async (req, res) => {
    const result = await EventSocialService.getEventFeedback(
      req.params.eventId,
      req.query,
    );
    return apiResponse.sendSuccess(res, result, "Feedback fetched");
  }),

  submitQuestion: asyncHandler(async (req, res) => {
    const result = await EventSocialService.submitQuestion(
      req.user.id,
      req.params.eventId,
      req.body,
    );
    return apiResponse.sendCreated(res, result, "Question submitted");
  }),

  answerQuestion: asyncHandler(async (req, res) => {
    const result = await EventSocialService.answerQuestion(
      req.user.id,
      req.params.eventId,
      req.params.questionId,
      req.body,
    );
    return apiResponse.sendSuccess(res, result, "Question answered");
  }),

  upvoteQuestion: asyncHandler(async (req, res) => {
    const result = await EventSocialService.upvoteQuestion(
      req.user.id,
      req.params.questionId,
    );
    return apiResponse.sendSuccess(res, result, "Question upvoted");
  }),

  pinQuestion: asyncHandler(async (req, res) => {
    const result = await EventSocialService.pinQuestion(
      req.user.id,
      req.params.eventId,
      req.params.questionId,
    );
    return apiResponse.sendSuccess(res, result, "Question pin toggled");
  }),

  getEventQuestions: asyncHandler(async (req, res) => {
    const result = await EventSocialService.getEventQuestions(
      req.params.eventId,
      req.query,
    );
    return apiResponse.sendSuccess(res, result, "Questions fetched");
  }),

  getJoinInfo: asyncHandler(async (req, res) => {
    const result = await EventLiveService.getJoinInfo(
      req.user.id,
      req.params.eventId,
    );
    return apiResponse.sendSuccess(res, result, "Join info fetched");
  }),

  startLiveEvent: asyncHandler(async (req, res) => {
    const result = await EventLiveService.startLiveEvent(
      req.user.id,
      req.params.eventId,
    );
    return apiResponse.sendSuccess(res, result, "Live event started");
  }),

  endLiveEvent: asyncHandler(async (req, res) => {
    const result = await EventLiveService.endLiveEvent(
      req.user.id,
      req.params.eventId,
    );
    return apiResponse.sendSuccess(res, result, "Live event ended");
  }),

  pauseLiveEvent: asyncHandler(async (req, res) => {
    const result = await EventLiveService.pauseLiveEvent(
      req.user.id,
      req.params.eventId,
    );
    return apiResponse.sendSuccess(res, result, "Live event paused");
  }),

  resumeLiveEvent: asyncHandler(async (req, res) => {
    const result = await EventLiveService.resumeLiveEvent(
      req.user.id,
      req.params.eventId,
    );
    return apiResponse.sendSuccess(res, result, "Live event resumed");
  }),

  getLiveSessionHistory: asyncHandler(async (req, res) => {
    const result = await EventLiveService.getLiveSessionHistory(
      req.params.eventId,
    );
    return apiResponse.sendSuccess(res, result, "Live session history fetched");
  }),
};
