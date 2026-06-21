import db from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";
import { buildQueryOptions } from "../../utils/queryHelper.js";

const verifyStartupAccess = async (userId, startupId) => {
  const member = await db.startupMember.findFirst({
    where: { startupId, userId, isActive: true },
  });
  if (!member) {
    throw new ApiError(403, "You don't have access to this startup");
  }
  return member;
};

const logActivity = async (data) => {
  return db.announcementActivity.create({ data });
};

export const startupAnnouncementService = {
  async createAnnouncement({ startupId, creatorId, data }) {
    if (!startupId) throw new ApiError(400, "startupId required");
    if (!creatorId) throw new ApiError(401, "creatorId required");

    const member = await verifyStartupAccess(creatorId, startupId);
    const { title, content, priority = "MEDIUM", targets = [], attachments = [] } = data;

    if (!title || !content) {
      throw new ApiError(400, "Title and content are required");
    }

    const announcement = await db.announcement.create({
      data: {
        title,
        content,
        priority,
        ownerType: "STARTUP",
        ownerId: startupId,
        visibility: "INTERNAL",
        scope: "CUSTOM",
        creatorId: member.id,
        creatorType: "STARTUP_MEMBER",
        isPublished: false,
        isArchived: false,
        isPinned: false,
      },
    });

    if (targets.length > 0) {
      await db.announcementTarget.createMany({
        data: targets.map((t) => ({
          announcementId: announcement.id,
          targetType: t.targetType,
          targetId: t.targetId,
          isExcluded: t.isExcluded || false,
        })),
        skipDuplicates: true,
      });
    }

    if (attachments.length > 0) {
      await db.announcementAttachment.createMany({
        data: attachments.map((att) => ({
          announcementId: announcement.id,
          fileName: att.fileName,
          fileUrl: att.fileUrl,
          fileKey: att.fileKey,
          fileType: att.fileType,
          fileSize: att.fileSize,
          uploadedById: member.id,
          uploadedByType: "STARTUP_MEMBER",
        })),
      });
    }

    await logActivity({
      announcementId: announcement.id,
      actorId: member.id,
      actorType: "STARTUP_MEMBER",
      action: "CREATED",
      metadata: { title, priority },
    });

    return this.getAnnouncementById({ startupId, announcementId: announcement.id, userId: creatorId });
  },

  async getAnnouncements({ startupId, userId, filters = {}, pagination = {} }) {
    if (!startupId) throw new ApiError(400, "startupId required");
    await verifyStartupAccess(userId, startupId);

    const { search, priority, isPublished, isPinned, isArchived = false } = filters;
    const { page = 1, limit = 10, sortBy = "createdAt", order = "desc" } = pagination;

    const { skip, take, orderBy, where: searchWhere } = buildQueryOptions({
      page,
      limit,
      search,
      searchFields: ["title", "content"],
      sortBy,
      order,
    });

    const where = {
      ownerType: "STARTUP",
      ownerId: startupId,
      isArchived,
      ...searchWhere,
    };

    if (priority) where.priority = priority;
    if (typeof isPublished === "boolean") where.isPublished = isPublished;
    if (typeof isPinned === "boolean") where.isPinned = isPinned;

    const [data, total] = await Promise.all([
      db.announcement.findMany({
        where,
        skip,
        take,
        orderBy: [{ isPinned: "desc" }, { pinnedAt: "desc" }, orderBy],
        include: {
          targets: true,
          attachments: true,
          _count: { select: { reads: true } },
        },
      }),
      db.announcement.count({ where }),
    ]);

    const announcements = await Promise.all(
      data.map(async (ann) => {
        const creator = await this.getCreatorInfo(ann.creatorId, ann.creatorType);
        return { ...ann, creator };
      })
    );

    return {
      announcements,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  },

  async getAnnouncementById({ startupId, announcementId, userId }) {
    await verifyStartupAccess(userId, startupId);

    const announcement = await db.announcement.findFirst({
      where: { id: announcementId, ownerType: "STARTUP", ownerId: startupId },
      include: {
        targets: true,
        attachments: true,
        reads: true,
        activities: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    if (!announcement) {
      throw new ApiError(404, "Announcement not found");
    }

    const creator = await this.getCreatorInfo(announcement.creatorId, announcement.creatorType);
    return { announcement: { ...announcement, creator } };
  },

  async updateAnnouncement({ startupId, announcementId, userId, data }) {
    const member = await verifyStartupAccess(userId, startupId);
    const { title, content, priority } = data;

    const existing = await db.announcement.findFirst({
      where: { id: announcementId, ownerType: "STARTUP", ownerId: startupId },
    });
    if (!existing) throw new ApiError(404, "Announcement not found");

    const changes = {};
    if (title && title !== existing.title) changes.title = { old: existing.title, new: title };
    if (content && content !== existing.content) changes.content = { old: existing.content, new: content };
    if (priority && priority !== existing.priority) changes.priority = { old: existing.priority, new: priority };

    await db.announcement.update({
      where: { id: announcementId },
      data: {
        title: title || existing.title,
        content: content || existing.content,
        priority: priority || existing.priority,
      },
    });

    if (Object.keys(changes).length > 0) {
      await logActivity({
        announcementId,
        actorId: member.id,
        actorType: "STARTUP_MEMBER",
        action: "UPDATED",
        metadata: changes,
      });
    }

    return this.getAnnouncementById({ startupId, announcementId, userId });
  },

  async deleteAnnouncement({ startupId, announcementId, userId }) {
    const member = await verifyStartupAccess(userId, startupId);

    const announcement = await db.announcement.findFirst({
      where: { id: announcementId, ownerType: "STARTUP", ownerId: startupId },
    });
    if (!announcement) throw new ApiError(404, "Announcement not found");

    await db.announcement.update({
      where: { id: announcementId },
      data: { isArchived: true, archivedAt: new Date() },
    });

    await logActivity({
      announcementId,
      actorId: member.id,
      actorType: "STARTUP_MEMBER",
      action: "ARCHIVED",
    });

    return { message: "Announcement archived successfully" };
  },

  async publishAnnouncement({ startupId, announcementId, userId }) {
    const member = await verifyStartupAccess(userId, startupId);

    const announcement = await db.announcement.findFirst({
      where: { id: announcementId, ownerType: "STARTUP", ownerId: startupId },
    });
    if (!announcement) throw new ApiError(404, "Announcement not found");
    if (announcement.isPublished) throw new ApiError(400, "Already published");

    await db.announcement.update({
      where: { id: announcementId },
      data: { isPublished: true, publishedAt: new Date() },
    });

    await logActivity({
      announcementId,
      actorId: member.id,
      actorType: "STARTUP_MEMBER",
      action: "PUBLISHED",
    });

    return this.getAnnouncementById({ startupId, announcementId, userId });
  },

  async pinAnnouncement({ startupId, announcementId, userId }) {
    const member = await verifyStartupAccess(userId, startupId);

    const announcement = await db.announcement.findFirst({
      where: { id: announcementId, ownerType: "STARTUP", ownerId: startupId },
    });
    if (!announcement) throw new ApiError(404, "Announcement not found");

    await db.announcement.update({
      where: { id: announcementId },
      data: { isPinned: true, pinnedAt: new Date() },
    });

    await logActivity({
      announcementId,
      actorId: member.id,
      actorType: "STARTUP_MEMBER",
      action: "PINNED",
    });

    return this.getAnnouncementById({ startupId, announcementId, userId });
  },

  async getCreatorInfo(creatorId, creatorType) {
    if (creatorType === "STARTUP_MEMBER") {
      const member = await db.startupMember.findUnique({
        where: { id: creatorId },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, profilePhoto: true } } },
      });
      if (member?.user) {
        return {
          id: member.id,
          name: `${member.user.firstName} ${member.user.lastName}`,
          email: member.user.email,
          imageUrl: member.user.profilePhoto,
        };
      }
    } else if (creatorType === "INCUBATION_USER") {
      return db.incubationUser.findUnique({
        where: { id: creatorId },
        select: { id: true, name: true, email: true, imageUrl: true },
      });
    }
    return null;
  },
};
