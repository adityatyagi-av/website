import { startupAnnouncementService } from "../../services/startup/announcement.service.js";
import { startupReceivedAnnouncementService } from "../../services/startup/announcementReceived.service.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";

export const StartupAnnouncementController = {
  createAnnouncement: asyncHandler(async (req, res) => {
    const { startupId } = req.params;
    const userId = req.user.id;
    const { title, content, priority, targets, attachments } = req.body;

    if (!startupId) {
      throw new ApiError(400, "startupId is required");
    }

    const result = await startupAnnouncementService.createAnnouncement({
      startupId,
      creatorId: userId,
      data: { title, content, priority, targets, attachments },
    });

    return apiResponse.sendSuccess(res, result, "Announcement created successfully");
  }),

  getAnnouncements: asyncHandler(async (req, res) => {
    const { startupId } = req.params;
    const userId = req.user.id;
    const { page, limit, sortBy, order, search, priority, isPublished, isPinned, isArchived } = req.query;

    if (!startupId) {
      throw new ApiError(400, "startupId is required");
    }

    const result = await startupAnnouncementService.getAnnouncements({
      startupId,
      userId,
      filters: {
        search,
        priority,
        isPublished: isPublished === "true" ? true : isPublished === "false" ? false : undefined,
        isPinned: isPinned === "true" ? true : isPinned === "false" ? false : undefined,
        isArchived: isArchived === "true",
      },
      pagination: { page: Number(page) || 1, limit: Number(limit) || 10, sortBy, order },
    });

    return apiResponse.sendSuccess(res, result, "Announcements fetched successfully");
  }),

  getAnnouncementById: asyncHandler(async (req, res) => {
    const { startupId, id } = req.params;
    const userId = req.user.id;

    if (!startupId || !id) {
      throw new ApiError(400, "startupId and announcement ID are required");
    }

    const result = await startupAnnouncementService.getAnnouncementById({
      startupId,
      announcementId: id,
      userId,
    });

    return apiResponse.sendSuccess(res, result, "Announcement fetched successfully");
  }),

  updateAnnouncement: asyncHandler(async (req, res) => {
    const { startupId, id } = req.params;
    const userId = req.user.id;
    const { title, content, priority } = req.body;

    if (!startupId || !id) {
      throw new ApiError(400, "startupId and announcement ID are required");
    }

    const result = await startupAnnouncementService.updateAnnouncement({
      startupId,
      announcementId: id,
      userId,
      data: { title, content, priority },
    });

    return apiResponse.sendSuccess(res, result, "Announcement updated successfully");
  }),

  deleteAnnouncement: asyncHandler(async (req, res) => {
    const { startupId, id } = req.params;
    const userId = req.user.id;

    if (!startupId || !id) {
      throw new ApiError(400, "startupId and announcement ID are required");
    }

    const result = await startupAnnouncementService.deleteAnnouncement({
      startupId,
      announcementId: id,
      userId,
    });

    return apiResponse.sendSuccess(res, result, "Announcement archived successfully");
  }),

  publishAnnouncement: asyncHandler(async (req, res) => {
    const { startupId, id } = req.params;
    const userId = req.user.id;

    if (!startupId || !id) {
      throw new ApiError(400, "startupId and announcement ID are required");
    }

    const result = await startupAnnouncementService.publishAnnouncement({
      startupId,
      announcementId: id,
      userId,
    });

    return apiResponse.sendSuccess(res, result, "Announcement published successfully");
  }),

  pinAnnouncement: asyncHandler(async (req, res) => {
    const { startupId, id } = req.params;
    const userId = req.user.id;

    if (!startupId || !id) {
      throw new ApiError(400, "startupId and announcement ID are required");
    }

    const result = await startupAnnouncementService.pinAnnouncement({
      startupId,
      announcementId: id,
      userId,
    });

    return apiResponse.sendSuccess(res, result, "Announcement pinned successfully");
  }),

  getReceivedAnnouncements: asyncHandler(async (req, res) => {
    const { startupId } = req.params;
    const userId = req.user.id;
    const { page, limit, sortBy, order, source, programId, isRead, priority, search } = req.query;

    if (!startupId) {
      throw new ApiError(400, "startupId is required");
    }

    const result = await startupReceivedAnnouncementService.getReceivedAnnouncements({
      startupId,
      userId,
      filters: { source, programId, isRead, priority, search },
      pagination: { page: Number(page) || 1, limit: Number(limit) || 10, sortBy, order },
    });

    return apiResponse.sendSuccess(res, result, "Received announcements fetched successfully");
  }),

  getReceivedAnnouncementById: asyncHandler(async (req, res) => {
    const { startupId, id } = req.params;
    const userId = req.user.id;

    if (!startupId || !id) {
      throw new ApiError(400, "startupId and announcement ID are required");
    }

    const result = await startupReceivedAnnouncementService.getReceivedAnnouncementById({
      startupId,
      announcementId: id,
      userId,
    });

    return apiResponse.sendSuccess(res, result, "Announcement fetched successfully");
  }),

  markAsRead: asyncHandler(async (req, res) => {
    const { startupId, id } = req.params;
    const userId = req.user.id;

    if (!startupId || !id) {
      throw new ApiError(400, "startupId and announcement ID are required");
    }

    const result = await startupReceivedAnnouncementService.markAsRead({
      startupId,
      announcementId: id,
      userId,
    });

    return apiResponse.sendSuccess(res, result, "Marked as read successfully");
  }),

  getUnreadCount: asyncHandler(async (req, res) => {
    const { startupId } = req.params;
    const userId = req.user.id;

    if (!startupId) {
      throw new ApiError(400, "startupId is required");
    }

    const result = await startupReceivedAnnouncementService.getUnreadCount({
      startupId,
      userId,
    });

    return apiResponse.sendSuccess(res, result, "Unread count fetched successfully");
  }),
};
