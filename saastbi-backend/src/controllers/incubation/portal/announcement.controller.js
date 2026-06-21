import { announcementService } from "../../../services/incubation/portal/announcement.service.js";
import { announcementTargetService } from "../../../services/incubation/portal/announcementTarget.service.js";
import { announcementAttachmentService } from "../../../services/incubation/portal/announcementAttachment.service.js";
import { announcementActivityService } from "../../../services/incubation/portal/announcementActivity.service.js";
import { ApiError } from "../../../utils/ApiError.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";

export const AnnouncementController = {
  createAnnouncement: asyncHandler(async (req, res) => {
    const { title, content, priority, visibility, scope, programId, expiresAt, targets, attachments } = req.body;
    const userId = req.user.incubationUserId;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;

    if (!tenantKey) {
      throw new ApiError(400, "tenantKey is required (send in headers or body)");
    }

    const result = await announcementService.createAnnouncement({
      title,
      content,
      priority,
      visibility,
      scope,
      programId,
      expiresAt,
      tenantKey,
      creatorId: userId,
      targets,
      attachments,
    });

    return apiResponse.sendSuccess(res, result, "Announcement created successfully");
  }),

  getAllAnnouncements: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
      search = "",
      scope,
      visibility,
      priority,
      isPublished,
      isPinned,
      isArchived,
      programId,
    } = req.query;

    if (!tenantKey) {
      throw new ApiError(400, "tenantKey is required");
    }

    const result = await announcementService.getAllAnnouncements({
      tenantKey,
      page: Number(page),
      limit: Number(limit),
      sortBy,
      order,
      search,
      scope,
      visibility,
      priority,
      isPublished: isPublished === "true" ? true : isPublished === "false" ? false : undefined,
      isPinned: isPinned === "true" ? true : isPinned === "false" ? false : undefined,
      isArchived: isArchived === "true",
      programId,
    });

    return apiResponse.sendSuccess(res, result, "Announcements fetched successfully");
  }),

  getAnnouncementById: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;

    if (!tenantKey) {
      throw new ApiError(400, "tenantKey is required");
    }

    if (!id) {
      throw new ApiError(400, "Announcement ID is required");
    }

    const result = await announcementService.getAnnouncementById({
      announcementId: id,
      tenantKey,
    });

    return apiResponse.sendSuccess(res, result, "Announcement fetched successfully");
  }),

  updateAnnouncement: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, content, priority, visibility, scope, programId, expiresAt } = req.body;
    const userId = req.user.incubationUserId;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;

    if (!tenantKey) {
      throw new ApiError(400, "tenantKey is required");
    }

    if (!id) {
      throw new ApiError(400, "Announcement ID is required");
    }

    const result = await announcementService.updateAnnouncement({
      announcementId: id,
      tenantKey,
      data: { title, content, priority, visibility, scope, programId, expiresAt },
      userId,
    });

    return apiResponse.sendSuccess(res, result, "Announcement updated successfully");
  }),

  deleteAnnouncement: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.incubationUserId;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;

    if (!tenantKey) {
      throw new ApiError(400, "tenantKey is required");
    }

    if (!id) {
      throw new ApiError(400, "Announcement ID is required");
    }

    const result = await announcementService.deleteAnnouncement({
      announcementId: id,
      tenantKey,
      userId,
    });

    return apiResponse.sendSuccess(res, result, "Announcement archived successfully");
  }),

  publishAnnouncement: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.incubationUserId;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;

    if (!tenantKey) {
      throw new ApiError(400, "tenantKey is required");
    }

    const result = await announcementService.publishAnnouncement({
      announcementId: id,
      tenantKey,
      userId,
    });

    return apiResponse.sendSuccess(res, result, "Announcement published successfully");
  }),

  unpublishAnnouncement: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.incubationUserId;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;

    if (!tenantKey) {
      throw new ApiError(400, "tenantKey is required");
    }

    const result = await announcementService.unpublishAnnouncement({
      announcementId: id,
      tenantKey,
      userId,
    });

    return apiResponse.sendSuccess(res, result, "Announcement unpublished successfully");
  }),

  pinAnnouncement: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.incubationUserId;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;

    if (!tenantKey) {
      throw new ApiError(400, "tenantKey is required");
    }

    const result = await announcementService.pinAnnouncement({
      announcementId: id,
      tenantKey,
      userId,
    });

    return apiResponse.sendSuccess(res, result, "Announcement pinned successfully");
  }),

  unpinAnnouncement: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.incubationUserId;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;

    if (!tenantKey) {
      throw new ApiError(400, "tenantKey is required");
    }

    const result = await announcementService.unpinAnnouncement({
      announcementId: id,
      tenantKey,
      userId,
    });

    return apiResponse.sendSuccess(res, result, "Announcement unpinned successfully");
  }),

  restoreAnnouncement: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.incubationUserId;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;

    if (!tenantKey) {
      throw new ApiError(400, "tenantKey is required");
    }

    const result = await announcementService.restoreAnnouncement({
      announcementId: id,
      tenantKey,
      userId,
    });

    return apiResponse.sendSuccess(res, result, "Announcement restored successfully");
  }),

  getAnnouncementStats: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;

    if (!tenantKey) {
      throw new ApiError(400, "tenantKey is required");
    }

    const result = await announcementService.getAnnouncementStats({ tenantKey });

    return apiResponse.sendSuccess(res, result, "Announcement stats fetched successfully");
  }),

  getAnnouncementReads: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;

    if (!tenantKey) {
      throw new ApiError(400, "tenantKey is required");
    }

    const result = await announcementService.getAnnouncementReads({
      announcementId: id,
      tenantKey,
      page: Number(page),
      limit: Number(limit),
    });

    return apiResponse.sendSuccess(res, result, "Announcement reads fetched successfully");
  }),

  addTargets: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { targets } = req.body;
    const userId = req.user.incubationUserId;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;

    if (!tenantKey) {
      throw new ApiError(400, "tenantKey is required");
    }

    if (!Array.isArray(targets) || targets.length === 0) {
      throw new ApiError(400, "Targets array is required");
    }

    const result = await announcementTargetService.addTargets(id, targets);

    await announcementActivityService.logActivity({
      announcementId: id,
      actorId: userId,
      actorType: "INCUBATION_USER",
      action: "TARGET_ADDED",
      metadata: { count: targets.length },
    });

    return apiResponse.sendSuccess(res, { targets: result }, "Targets added successfully");
  }),

  removeTargets: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { targetIds } = req.body;
    const userId = req.user.incubationUserId;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;

    if (!tenantKey) {
      throw new ApiError(400, "tenantKey is required");
    }

    if (!Array.isArray(targetIds) || targetIds.length === 0) {
      throw new ApiError(400, "Target IDs array is required");
    }

    await announcementTargetService.removeTargets(id, targetIds);

    await announcementActivityService.logActivity({
      announcementId: id,
      actorId: userId,
      actorType: "INCUBATION_USER",
      action: "TARGET_REMOVED",
      metadata: { count: targetIds.length },
    });

    return apiResponse.sendSuccess(res, null, "Targets removed successfully");
  }),

  addExclusions: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { exclusions } = req.body;
    const userId = req.user.incubationUserId;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;

    if (!tenantKey) {
      throw new ApiError(400, "tenantKey is required");
    }

    if (!Array.isArray(exclusions) || exclusions.length === 0) {
      throw new ApiError(400, "Exclusions array is required");
    }

    const result = await announcementTargetService.addExclusions(id, exclusions);

    await announcementActivityService.logActivity({
      announcementId: id,
      actorId: userId,
      actorType: "INCUBATION_USER",
      action: "TARGET_ADDED",
      metadata: { count: exclusions.length, isExclusion: true },
    });

    return apiResponse.sendSuccess(res, { exclusions: result }, "Exclusions added successfully");
  }),

  removeExclusion: asyncHandler(async (req, res) => {
    const { id, exclusionId } = req.params;
    const userId = req.user.incubationUserId;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;

    if (!tenantKey) {
      throw new ApiError(400, "tenantKey is required");
    }

    await announcementTargetService.removeExclusion(id, exclusionId);

    await announcementActivityService.logActivity({
      announcementId: id,
      actorId: userId,
      actorType: "INCUBATION_USER",
      action: "TARGET_REMOVED",
      metadata: { isExclusion: true },
    });

    return apiResponse.sendSuccess(res, null, "Exclusion removed successfully");
  }),

  getTargets: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;

    if (!tenantKey) {
      throw new ApiError(400, "tenantKey is required");
    }

    const targets = await announcementTargetService.getTargets(id);
    const targetsWithDetails = await announcementTargetService.getTargetDetails(targets);

    return apiResponse.sendSuccess(res, { targets: targetsWithDetails }, "Targets fetched successfully");
  }),

  addAttachment: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { fileName, fileUrl, fileKey, fileType, fileSize } = req.body;
    const userId = req.user.incubationUserId;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;

    if (!tenantKey) {
      throw new ApiError(400, "tenantKey is required");
    }

    if (!fileName || !fileUrl) {
      throw new ApiError(400, "fileName and fileUrl are required");
    }

    const result = await announcementAttachmentService.addAttachment({
      announcementId: id,
      tenantKey,
      userId,
      attachment: { fileName, fileUrl, fileKey, fileType, fileSize },
    });

    return apiResponse.sendSuccess(res, { attachment: result }, "Attachment added successfully");
  }),

  removeAttachment: asyncHandler(async (req, res) => {
    const { id, attachmentId } = req.params;
    const userId = req.user.incubationUserId;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;

    if (!tenantKey) {
      throw new ApiError(400, "tenantKey is required");
    }

    const result = await announcementAttachmentService.removeAttachment({
      announcementId: id,
      attachmentId,
      tenantKey,
      userId,
    });

    return apiResponse.sendSuccess(res, result, "Attachment removed successfully");
  }),
};
