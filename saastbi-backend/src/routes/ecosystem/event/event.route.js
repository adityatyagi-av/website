import { Router } from "express";
import { authenticate, optionalAuthenticate } from "../../../middlewares/auth.middleware.js";
import { EventController } from "../../../controllers/ecosystem/event/event.controller.js";

const EventRouter = Router();

EventRouter.post("/event", authenticate, EventController.createEvent);
EventRouter.patch("/event/:eventId", authenticate, EventController.updateEvent);
EventRouter.patch("/event/:eventId/recurring", authenticate, EventController.updateRecurringEvents);
EventRouter.post("/event/:eventId/publish", authenticate, EventController.publishEvent);
EventRouter.post("/event/:eventId/cancel", authenticate, EventController.cancelEvent);
EventRouter.post("/event/:eventId/complete", authenticate, EventController.completeEvent);
EventRouter.delete("/event/:eventId", authenticate, EventController.deleteEvent);
EventRouter.post("/event/:eventId/duplicate", authenticate, EventController.duplicateEvent);

EventRouter.get("/event/all", optionalAuthenticate, EventController.getAllEvents);
EventRouter.get("/event/my-events", authenticate, EventController.getMyEvents);
EventRouter.get("/event/hosting", authenticate, EventController.getHostingEvents);
EventRouter.get("/event/saved", authenticate, EventController.getSavedEvents);
EventRouter.get("/event/live-now", optionalAuthenticate, EventController.getLiveNow);
EventRouter.get("/event/upcoming-week", optionalAuthenticate, EventController.getUpcomingThisWeek);
EventRouter.get("/event/trending", optionalAuthenticate, EventController.getTrendingEvents);
EventRouter.get("/event/categories", optionalAuthenticate, EventController.getPopularCategories);
EventRouter.get("/event/recommended", authenticate, EventController.getRecommendedEvents);
EventRouter.get("/event/invitations/mine", authenticate, EventController.getMyInvitations);
EventRouter.get("/event/registrations/mine", authenticate, EventController.getUserRegistrations);
EventRouter.get("/event/page/:pageId", optionalAuthenticate, EventController.getEventsByPage);
EventRouter.get("/event/detail/:eventId", optionalAuthenticate, EventController.getEventById);
EventRouter.get("/event/:slug", optionalAuthenticate, EventController.getEventBySlug);

EventRouter.post("/event/:eventId/ticket-type", authenticate, EventController.createTicketType);
EventRouter.patch("/event/ticket-type/:ticketTypeId", authenticate, EventController.updateTicketType);
EventRouter.delete("/event/ticket-type/:ticketTypeId", authenticate, EventController.deleteTicketType);
EventRouter.get("/event/:eventId/tickets", optionalAuthenticate, EventController.getAvailableTickets);

EventRouter.post("/event/:eventId/register", authenticate, EventController.registerForEvent);
EventRouter.post("/event/:eventId/verify-payment", authenticate, EventController.verifyPayment);
EventRouter.post("/event/:eventId/cancel-registration", authenticate, EventController.cancelRegistration);
EventRouter.get("/event/:eventId/registration-status", authenticate, EventController.getRegistrationStatus);
EventRouter.get("/event/:eventId/registrations", authenticate, EventController.getRegistrations);
EventRouter.get("/event/:eventId/registrations/summary", authenticate, EventController.getRegistrationSummary);
EventRouter.post("/event/:eventId/registrations/approve", authenticate, EventController.approveRegistrations);
EventRouter.post("/event/:eventId/registrations/reject", authenticate, EventController.rejectRegistrations);
EventRouter.post("/event/:eventId/registrations/promote-waitlist", authenticate, EventController.promoteFromWaitlist);
EventRouter.post("/event/:eventId/check-in", authenticate, EventController.checkIn);
EventRouter.post("/event/:eventId/bulk-check-in", authenticate, EventController.bulkCheckIn);
EventRouter.get("/event/:eventId/registrations/export", authenticate, EventController.exportRegistrations);

EventRouter.post("/event/:eventId/organizer", authenticate, EventController.addOrganizer);
EventRouter.patch("/event/:eventId/organizer/:organizerId", authenticate, EventController.updateOrganizer);
EventRouter.delete("/event/:eventId/organizer/:organizerId", authenticate, EventController.removeOrganizer);

EventRouter.post("/event/:eventId/speaker", authenticate, EventController.addSpeaker);
EventRouter.patch("/event/:eventId/speaker/:speakerId", authenticate, EventController.updateSpeaker);
EventRouter.delete("/event/:eventId/speaker/:speakerId", authenticate, EventController.removeSpeaker);

EventRouter.post("/event/:eventId/sponsor", authenticate, EventController.addSponsor);
EventRouter.patch("/event/:eventId/sponsor/:sponsorId", authenticate, EventController.updateSponsor);
EventRouter.delete("/event/:eventId/sponsor/:sponsorId", authenticate, EventController.removeSponsor);

EventRouter.post("/event/:eventId/timeline", authenticate, EventController.addTimelineItem);
EventRouter.patch("/event/:eventId/timeline/:timelineId", authenticate, EventController.updateTimelineItem);
EventRouter.delete("/event/:eventId/timeline/:timelineId", authenticate, EventController.removeTimelineItem);

EventRouter.post("/event/:eventId/media", authenticate, EventController.addMedia);
EventRouter.delete("/event/:eventId/media/:mediaId", authenticate, EventController.removeMedia);

EventRouter.post("/event/:eventId/update", authenticate, EventController.sendEventUpdate);
EventRouter.get("/event/:eventId/updates", optionalAuthenticate, EventController.getEventUpdates);
EventRouter.get("/event/:eventId/analytics", authenticate, EventController.getEventAnalytics);

EventRouter.post("/event/:eventId/bookmark", authenticate, EventController.bookmarkEvent);
EventRouter.delete("/event/:eventId/bookmark", authenticate, EventController.unbookmarkEvent);

EventRouter.post("/event/:eventId/invite", authenticate, EventController.inviteToEvent);
EventRouter.post("/event/invitation/:invitationId/respond", authenticate, EventController.respondToInvitation);

EventRouter.post("/event/:eventId/feedback", authenticate, EventController.submitFeedback);
EventRouter.get("/event/:eventId/feedback", optionalAuthenticate, EventController.getEventFeedback);

EventRouter.post("/event/:eventId/question", authenticate, EventController.submitQuestion);
EventRouter.post("/event/:eventId/question/:questionId/answer", authenticate, EventController.answerQuestion);
EventRouter.post("/event/question/:questionId/upvote", authenticate, EventController.upvoteQuestion);
EventRouter.post("/event/:eventId/question/:questionId/pin", authenticate, EventController.pinQuestion);
EventRouter.get("/event/:eventId/questions", optionalAuthenticate, EventController.getEventQuestions);

EventRouter.get("/event/:eventId/live/join", authenticate, EventController.getJoinInfo);
EventRouter.post("/event/:eventId/live/start", authenticate, EventController.startLiveEvent);
EventRouter.post("/event/:eventId/live/end", authenticate, EventController.endLiveEvent);
EventRouter.post("/event/:eventId/live/pause", authenticate, EventController.pauseLiveEvent);
EventRouter.post("/event/:eventId/live/resume", authenticate, EventController.resumeLiveEvent);
EventRouter.get("/event/:eventId/live/history", authenticate, EventController.getLiveSessionHistory);

export default EventRouter;
