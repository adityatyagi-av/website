import { ApiError } from "../../../utils/ApiError.js";
import db from "../../../db/db.js";
import { announcementActivityService } from "./announcementActivity.service.js";

export const announcementAttachmentService = {
  async addAttachment({ announcementId, tenantKey, userId, attachment }) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(400, "Invalid tenantKey - tenant not found");

    const announcement = await db.announcement.findFirst({
      where: { id: announcementId, ownerType: "INCUBATION", ownerId: tenant.id },
    });
    if (!announcement) throw new ApiError(404, "Announcement not found");

    const created = await db.announcementAttachment.create({
      data: {
        announcementId,
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl,
        fileKey: attachment.fileKey,
        fileType: attachment.fileType,
        fileSize: attachment.fileSize,
        uploadedById: userId,
        uploadedByType: "INCUBATION_USER",
      },
    });

    await announcementActivityService.logActivity({
      announcementId,
      actorId: userId,
      actorType: "INCUBATION_USER",
      action: "ATTACHMENT_ADDED",
      metadata: { fileName: attachment.fileName, fileType: attachment.fileType },
    });

    return created;
  },

  async removeAttachment({ announcementId, attachmentId, tenantKey, userId }) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(400, "Invalid tenantKey - tenant not found");

    const announcement = await db.announcement.findFirst({
      where: { id: announcementId, ownerType: "INCUBATION", ownerId: tenant.id },
    });
    if (!announcement) throw new ApiError(404, "Announcement not found");

    const attachment = await db.announcementAttachment.findFirst({
      where: { id: attachmentId, announcementId },
    });
    if (!attachment) throw new ApiError(404, "Attachment not found");

    await db.announcementAttachment.delete({ where: { id: attachmentId } });

    await announcementActivityService.logActivity({
      announcementId,
      actorId: userId,
      actorType: "INCUBATION_USER",
      action: "ATTACHMENT_REMOVED",
      metadata: { fileName: attachment.fileName },
    });

    return { message: "Attachment removed successfully" };
  },

  async getAttachments(announcementId) {
    return db.announcementAttachment.findMany({
      where: { announcementId },
      orderBy: { createdAt: "desc" },
    });
  },
};
