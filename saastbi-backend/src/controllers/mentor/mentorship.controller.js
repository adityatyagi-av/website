import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";
import { MentorshipService } from "../../services/mentor/mentorship.service.js";

export const MentorshipController = {
  create: asyncHandler(async (req, res) => {
    const mentorship = await MentorshipService.create(req.user.id, req.body);
    return apiResponse.sendSuccess(res, mentorship, "Mentorship request sent", 201);
  }),

  accept: asyncHandler(async (req, res) => {
    const { mentorshipId } = req.params;
    const mentorship = await MentorshipService.accept(req.user.id, mentorshipId, req.body);
    return apiResponse.sendSuccess(res, mentorship, "Mentorship accepted");
  }),

  updateStatus: asyncHandler(async (req, res) => {
    const { mentorshipId } = req.params;
    const { status, reason } = req.body;
    const mentorship = await MentorshipService.updateStatus(req.user.id, mentorshipId, status, reason);
    return apiResponse.sendSuccess(res, mentorship, "Mentorship status updated");
  }),

  end: asyncHandler(async (req, res) => {
    const { mentorshipId } = req.params;
    const { reason } = req.body;
    const mentorship = await MentorshipService.end(req.user.id, mentorshipId, reason);
    return apiResponse.sendSuccess(res, mentorship, "Mentorship ended");
  }),

  getById: asyncHandler(async (req, res) => {
    const { mentorshipId } = req.params;
    const mentorship = await MentorshipService.getById(req.user.id, mentorshipId);
    return apiResponse.sendSuccess(res, mentorship);
  }),

  getMentorMentorships: asyncHandler(async (req, res) => {
    const result = await MentorshipService.getMentorMentorships(req.user.id, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  getMenteeMentorships: asyncHandler(async (req, res) => {
    const result = await MentorshipService.getMenteeMentorships(req.user.id, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  getStartupMentorships: asyncHandler(async (req, res) => {
    const { startupId } = req.params;
    const result = await MentorshipService.getMenteeMentorships(req.user.id, req.query, startupId);
    return apiResponse.sendSuccess(res, result);
  }),

  addMilestone: asyncHandler(async (req, res) => {
    const { mentorshipId } = req.params;
    const milestone = await MentorshipService.addMilestone(req.user.id, mentorshipId, req.body);
    return apiResponse.sendSuccess(res, milestone, "Milestone added", 201);
  }),

  updateMilestone: asyncHandler(async (req, res) => {
    const { milestoneId } = req.params;
    const milestone = await MentorshipService.updateMilestone(req.user.id, milestoneId, req.body);
    return apiResponse.sendSuccess(res, milestone, "Milestone updated");
  }),

  deleteMilestone: asyncHandler(async (req, res) => {
    const { milestoneId } = req.params;
    await MentorshipService.deleteMilestone(req.user.id, milestoneId);
    return apiResponse.sendSuccess(res, null, "Milestone deleted");
  }),

  getMilestones: asyncHandler(async (req, res) => {
    const { mentorshipId } = req.params;
    const milestones = await MentorshipService.getMilestones(req.user.id, mentorshipId);
    return apiResponse.sendSuccess(res, milestones);
  }),
};
