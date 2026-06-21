import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";
import { SessionService } from "../../services/mentor/session.service.js";

export const SessionController = {
  book: asyncHandler(async (req, res) => {
    const { mentorId } = req.params;
    const session = await SessionService.book(req.user.id, mentorId, req.body);
    return apiResponse.sendSuccess(res, session, "Session booked", 201);
  }),

  confirm: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { notes } = req.body;
    const session = await SessionService.confirm(req.user.id, sessionId, notes);
    return apiResponse.sendSuccess(res, session, "Session confirmed");
  }),

  decline: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { reason } = req.body;
    const session = await SessionService.decline(req.user.id, sessionId, reason);
    return apiResponse.sendSuccess(res, session, "Session declined");
  }),

  cancelAsMentor: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { reason } = req.body;
    const result = await SessionService.cancel(req.user.id, sessionId, reason, true);
    return apiResponse.sendSuccess(res, result, "Session cancelled");
  }),

  cancelAsMentee: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { reason } = req.body;
    const result = await SessionService.cancel(req.user.id, sessionId, reason, false);
    return apiResponse.sendSuccess(res, result, "Session cancelled");
  }),

  reschedule: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { newStartTime, reason } = req.body;
    const session = await SessionService.reschedule(req.user.id, sessionId, newStartTime, reason);
    return apiResponse.sendSuccess(res, session, "Session rescheduled");
  }),

  updateNotes: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const session = await SessionService.updateNotes(req.user.id, sessionId, req.body);
    return apiResponse.sendSuccess(res, session, "Notes updated");
  }),

  complete: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const session = await SessionService.complete(req.user.id, sessionId, req.body);
    return apiResponse.sendSuccess(res, session, "Session marked as complete");
  }),

  extend: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { extensionMinutes, isFree } = req.body;
    const session = await SessionService.extend(req.user.id, sessionId, extensionMinutes, isFree);
    return apiResponse.sendSuccess(res, session, "Session extended");
  }),

  getById: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const session = await SessionService.getById(req.user.id, sessionId);
    return apiResponse.sendSuccess(res, session);
  }),

  getMentorSessions: asyncHandler(async (req, res) => {
    const result = await SessionService.getMentorSessions(req.user.id, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  getMenteeSessions: asyncHandler(async (req, res) => {
    const result = await SessionService.getMenteeSessions(req.user.id, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  getStartupSessions: asyncHandler(async (req, res) => {
    const { startupId } = req.params;
    const result = await SessionService.getMenteeSessions(req.user.id, req.query, startupId);
    return apiResponse.sendSuccess(res, result);
  }),

  submitReview: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const review = await SessionService.submitReview(req.user.id, sessionId, req.body);
    return apiResponse.sendSuccess(res, review, "Review submitted", 201);
  }),

  markNoShow: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const session = await SessionService.markNoShow(req.user.id, sessionId);
    return apiResponse.sendSuccess(res, session, "Session marked as no-show");
  }),
};
