import { mentorAnnouncementService } from "../../services/mentor/announcement.service.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";

export const MentorAnnouncementController = {
  getReceivedAnnouncements: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { page, limit, sortBy, order, incubatorId, isRead, priority, search } = req.query;

    const result = await mentorAnnouncementService.getReceivedAnnouncements({
      userId,
      filters: { tenantId: incubatorId, isRead, priority, search },
      pagination: { page: Number(page) || 1, limit: Number(limit) || 10, sortBy, order },
    });

    return apiResponse.sendSuccess(res, result, "Announcements fetched successfully");
  }),

  getReceivedAnnouncementById: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, "Announcement ID is required");
    }

    const result = await mentorAnnouncementService.getReceivedAnnouncementById({
      userId,
      announcementId: id,
    });

    return apiResponse.sendSuccess(res, result, "Announcement fetched successfully");
  }),

  markAsRead: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    if (!id) {
      throw new ApiError(400, "Announcement ID is required");
    }

    const result = await mentorAnnouncementService.markAsRead({
      userId,
      announcementId: id,
    });

    return apiResponse.sendSuccess(res, result, "Marked as read successfully");
  }),

  getUnreadCount: asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const result = await mentorAnnouncementService.getUnreadCount({ userId });

    return apiResponse.sendSuccess(res, result, "Unread count fetched successfully");
  }),

  getAnnouncementsByIncubator: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { incubatorId } = req.params;
    const { page, limit, sortBy, order } = req.query;

    if (!incubatorId) {
      throw new ApiError(400, "Incubator ID is required");
    }

    const result = await mentorAnnouncementService.getAnnouncementsByIncubator({
      userId,
      tenantId: incubatorId,
      pagination: { page: Number(page) || 1, limit: Number(limit) || 10, sortBy, order },
    });

    return apiResponse.sendSuccess(res, result, "Announcements fetched successfully");
  }),
};
