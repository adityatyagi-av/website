import { NotificationService } from "../../../services/common/notification.service.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";

export const NotificationController = {
  getNotifications: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { page, limit, category, isRead, type } = req.query;

    const result = await NotificationService.getNotifications({
      userId,
      category: category || undefined,
      isRead: isRead === "true" ? true : isRead === "false" ? false : undefined,
      type: type || undefined,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });

    return apiResponse.sendSuccess(res, result, "Notifications fetched");
  }),

  getUnreadCount: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await NotificationService.getUnreadCount(userId);
    return apiResponse.sendSuccess(res, result, "Unread count fetched");
  }),

  getById: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const notification = await NotificationService.getById(req.params.id, userId);

    if (!notification) {
      return apiResponse.sendNotFound(res, "Notification not found");
    }

    return apiResponse.sendSuccess(res, notification, "Notification fetched");
  }),

  markAsRead: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await NotificationService.markAsRead(req.params.id, userId);

    if (!result) {
      return apiResponse.sendNotFound(res, "Notification not found");
    }

    return apiResponse.sendUpdated(res, result, "Notification marked as read");
  }),

  markAllAsRead: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { category } = req.body;

    const result = await NotificationService.markAllAsRead(userId, category || null);
    return apiResponse.sendUpdated(res, result, "All notifications marked as read");
  }),

  archiveNotification: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await NotificationService.archiveNotification(req.params.id, userId);

    if (!result) {
      return apiResponse.sendNotFound(res, "Notification not found");
    }

    return apiResponse.sendDeleted(res, result, "Notification archived");
  }),

  clearArchived: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await NotificationService.clearArchived(userId);
    return apiResponse.sendDeleted(res, result, "Archived notifications cleared");
  }),

  getPreferences: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await NotificationService.getPreferences(userId);
    return apiResponse.sendSuccess(res, result, "Notification preferences fetched");
  }),

  updatePreferences: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { preferences } = req.body;

    const result = await NotificationService.updatePreferences(userId, preferences);
    return apiResponse.sendUpdated(res, result, "Notification preferences updated");
  }),
};
