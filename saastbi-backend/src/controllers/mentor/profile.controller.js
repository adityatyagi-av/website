import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";
import { MentorProfileService } from "../../services/mentor/profile.service.js";

export const MentorProfileController = {
  createProfile: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const data = req.body;
    const profile = await MentorProfileService.createProfile({ userId, data });
    return apiResponse.sendSuccess(res, profile, "Mentor profile created", 201);
  }),

  getOwnProfile: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const profile = await MentorProfileService.getOwnProfile({ userId });
    return apiResponse.sendSuccess(res, profile);
  }),

  updateProfile: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const data = req.body;
    const profile = await MentorProfileService.updateProfile({ userId, data });
    return apiResponse.sendSuccess(res, profile, "Profile updated");
  }),

  updateVisibility: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { profileVisibility } = req.body;
    const profile = await MentorProfileService.updateVisibility({ userId, visibility: profileVisibility });
    return apiResponse.sendSuccess(res, profile, "Visibility updated");
  }),

  getProfileStats: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const stats = await MentorProfileService.getProfileStats({ userId });
    return apiResponse.sendSuccess(res, stats);
  }),

  getPublicProfile: asyncHandler(async (req, res) => {
    const { mentorId } = req.params;
    const viewerId = req.user?.id;
    const startupId = req.user?.startupId; // Extract startupId if available
    
    const profile = await MentorProfileService.getPublicProfile({ mentorId, viewerId, startupId });
    return apiResponse.sendSuccess(res, profile);
  }),

  discoverMentors: asyncHandler(async (req, res) => {
    const viewerId = req.user?.id;
    const result = await MentorProfileService.discoverMentors({ query: req.query, viewerId });
    return apiResponse.sendSuccess(res, result);
  }),

  getFeaturedMentors: asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const mentors = await MentorProfileService.getFeaturedMentors({ limit });
    return apiResponse.sendSuccess(res, mentors);
  }),

  getMentorReviews: asyncHandler(async (req, res) => {
    const { mentorId } = req.params;
    const result = await MentorProfileService.getMentorReviews({ mentorId, query: req.query });
    return apiResponse.sendSuccess(res, result);
  }),
};
