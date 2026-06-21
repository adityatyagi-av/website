import { ApiError } from "../../../utils/ApiError.js";
import db from "../../../db/db.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";
import { announcementEmailService } from "./announcementEmail.service.js";
import { announcementActivityService } from "./announcementActivity.service.js";
import { announcementTargetService } from "./announcementTarget.service.js";
import { NotificationService } from "../../common/notification.service.js";

export const announcementService = {
  async createAnnouncement(data) {
    const {
      title,
      content,
      priority = "MEDIUM",
      visibility = "INTERNAL",
      scope = "TENANT_WIDE",
      programId,
      expiresAt,
      tenantKey,
      creatorId,
      targets = [],
      attachments = [],
    } = data;

    if (!title || !content) {
      throw new ApiError(400, "Title and content are required");
    }

    const tenant = await db.tenant.findUnique({
      where: { tenantKey },
    });
    if (!tenant) {
      throw new ApiError(400, "Invalid tenantKey - tenant not found");
    }

    if (scope === "PROGRAM_SPECIFIC" && !programId) {
      throw new ApiError(400, "Program ID is required for program-specific announcements");
    }

    if (programId) {
      const program = await db.program.findFirst({
        where: { id: programId, tenantId: tenant.id },
      });
      if (!program) {
        throw new ApiError(400, "Invalid programId - program not found");
      }
    }

    const announcement = await db.announcement.create({
      data: {
        title,
        content,
        priority,
        ownerType: "INCUBATION",
        ownerId: tenant.id,
        visibility,
        scope,
        programId: scope === "PROGRAM_SPECIFIC" ? programId : null,
        creatorId,
        creatorType: "INCUBATION_USER",
        isPublished: false,
        isArchived: false,
        isPinned: false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    if (targets.length > 0) {
      await announcementTargetService.addTargets(announcement.id, targets);
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
          uploadedById: creatorId,
          uploadedByType: "INCUBATION_USER",
        })),
      });
    }

    await announcementActivityService.logActivity({
      announcementId: announcement.id,
      actorId: creatorId,
      actorType: "INCUBATION_USER",
      action: "CREATED",
      metadata: { title, scope, visibility, priority },
    });

    return this.getAnnouncementById({ announcementId: announcement.id, tenantKey });
  },

  async getAllAnnouncements({
    tenantKey,
    page = 1,
    limit = 10,
    search = "",
    sortBy = "createdAt",
    order = "desc",
    scope,
    visibility,
    priority,
    isPublished,
    isPinned,
    isArchived = false,
    programId,
  }) {
    const tenant = await db.tenant.findUnique({
      where: { tenantKey },
    });
    if (!tenant) {
      throw new ApiError(400, "Invalid tenantKey - tenant not found");
    }

    const {
      skip,
      take,
      orderBy,
      where: searchWhere,
    } = buildQueryOptions({
      page,
      limit,
      search,
      searchFields: ["title", "content"],
      sortBy,
      order,
    });

    const where = {
      ownerType: "INCUBATION",
      ownerId: tenant.id,
      isArchived,
      ...searchWhere,
    };

    if (scope) where.scope = scope;
    if (visibility) where.visibility = visibility;
    if (priority) where.priority = priority;
    if (typeof isPublished === "boolean") where.isPublished = isPublished;
    if (typeof isPinned === "boolean") where.isPinned = isPinned;
    if (programId) where.programId = programId;

    const [data, total] = await Promise.all([
      db.announcement.findMany({
        where,
        skip,
        take,
        orderBy: [{ isPinned: "desc" }, { pinnedAt: "desc" }, ...Object.entries(orderBy).map(([k, v]) => ({ [k]: v }))],
        include: {
          program: { select: { id: true, title: true } },
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

  async getAnnouncementById({ announcementId, tenantKey }) {
    const tenant = await db.tenant.findUnique({
      where: { tenantKey },
    });
    if (!tenant) {
      throw new ApiError(400, "Invalid tenantKey - tenant not found");
    }

    const announcement = await db.announcement.findFirst({
      where: {
        id: announcementId,
        ownerType: "INCUBATION",
        ownerId: tenant.id,
      },
      include: {
        program: { select: { id: true, title: true } },
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

  async updateAnnouncement({ announcementId, tenantKey, data, userId }) {
    const { title, content, priority, visibility, scope, programId, expiresAt } = data;

    const tenant = await db.tenant.findUnique({
      where: { tenantKey },
    });
    if (!tenant) {
      throw new ApiError(400, "Invalid tenantKey - tenant not found");
    }

    const existing = await db.announcement.findFirst({
      where: { id: announcementId, ownerType: "INCUBATION", ownerId: tenant.id },
    });
    if (!existing) {
      throw new ApiError(404, "Announcement not found");
    }

    if (scope === "PROGRAM_SPECIFIC" && !programId) {
      throw new ApiError(400, "Program ID is required for program-specific announcements");
    }

    const changes = {};
    if (title && title !== existing.title) changes.title = { old: existing.title, new: title };
    if (content && content !== existing.content) changes.content = { old: existing.content, new: content };
    if (priority && priority !== existing.priority) changes.priority = { old: existing.priority, new: priority };
    if (visibility && visibility !== existing.visibility) changes.visibility = { old: existing.visibility, new: visibility };
    if (scope && scope !== existing.scope) changes.scope = { old: existing.scope, new: scope };

    const updated = await db.announcement.update({
      where: { id: announcementId },
      data: {
        title: title || existing.title,
        content: content || existing.content,
        priority: priority || existing.priority,
        visibility: visibility || existing.visibility,
        scope: scope || existing.scope,
        programId: scope === "PROGRAM_SPECIFIC" ? programId : null,
        expiresAt: expiresAt ? new Date(expiresAt) : existing.expiresAt,
      },
    });

    if (Object.keys(changes).length > 0) {
      await announcementActivityService.logActivity({
        announcementId,
        actorId: userId,
        actorType: "INCUBATION_USER",
        action: "UPDATED",
        metadata: changes,
      });
    }

    return this.getAnnouncementById({ announcementId, tenantKey });
  },

  async deleteAnnouncement({ announcementId, tenantKey, userId }) {
    const tenant = await db.tenant.findUnique({
      where: { tenantKey },
    });
    if (!tenant) {
      throw new ApiError(400, "Invalid tenantKey - tenant not found");
    }

    const announcement = await db.announcement.findFirst({
      where: { id: announcementId, ownerType: "INCUBATION", ownerId: tenant.id },
    });
    if (!announcement) {
      throw new ApiError(404, "Announcement not found");
    }

    await db.announcement.update({
      where: { id: announcementId },
      data: { isArchived: true, archivedAt: new Date() },
    });

    await announcementActivityService.logActivity({
      announcementId,
      actorId: userId,
      actorType: "INCUBATION_USER",
      action: "ARCHIVED",
    });

    return { message: "Announcement archived successfully", deletedId: announcementId };
  },

  async publishAnnouncement({ announcementId, tenantKey, userId }) {
    const tenant = await db.tenant.findUnique({
      where: { tenantKey },
    });
    if (!tenant) {
      throw new ApiError(400, "Invalid tenantKey - tenant not found");
    }

    const announcement = await db.announcement.findFirst({
      where: { id: announcementId, ownerType: "INCUBATION", ownerId: tenant.id },
      include: { program: true, targets: true },
    });
    if (!announcement) {
      throw new ApiError(404, "Announcement not found");
    }

    if (announcement.isPublished) {
      throw new ApiError(400, "Announcement is already published");
    }

    if (announcement.isArchived) {
      throw new ApiError(400, "Archived announcement cannot be published");
    }
    
    if (announcement.expiresAt && new Date() > new Date(announcement.expiresAt)) {
      throw new ApiError(400, "Announcement has already expired");
    }

    await db.announcement.update({
      where: { id: announcementId },
      data: { isPublished: true, publishedAt: new Date() },
    });

    await announcementActivityService.logActivity({
      announcementId,
      actorId: userId,
      actorType: "INCUBATION_USER",
      action: "PUBLISHED",
    });

    const recipientIds = new Set();
    // all startup members under that incubation tenant
    if (
      announcement.scope ===
      "TENANT_WIDE"
    ) {
  
      const startupAssociations =
        await db.startupTenantAssociation.findMany({
          where: {
            tenantId:
              tenant.id,
  
            isActive: true,
          },
  
          select: {
            startupId: true,
          },
        });
  
      const startupIds =
        startupAssociations.map(
          (s) => s.startupId
        );
  
      if (startupIds.length > 0) {
  
        const members =
          await db.startupMember.findMany({
            where: {
              startupId: {
                in: startupIds,
              },
  
              isActive: true,
            },
  
            select: {
              userId: true,
            },
          });
  
        members.forEach((m) =>
          recipientIds.add(
            m.userId
          )
        );
      }
    }
  
  // startups enrolled in that program, all active members of those startups
    else if (
      announcement.scope ===
      "PROGRAM_SPECIFIC"
    ) {
  
      const programAssociations =
        await db.startupProgramAssociation.findMany({
          where: {
            tenantId:
              tenant.id,
  
            programId:
              announcement.programId,
  
            isActive: true,
          },
  
          select: {
            startupId: true,
          },
        });
  
      const startupIds =
        programAssociations.map(
          (s) => s.startupId
        );
  
      if (startupIds.length > 0) {
  
        const members =
          await db.startupMember.findMany({
            where: {
              startupId: {
                in: startupIds,
              },
  
              isActive: true,
            },
  
            select: {
              userId: true,
            },
          });
  
        members.forEach((m) =>
          recipientIds.add(
            m.userId
          )
        );
      }
    }
  // ONLY selected startups all active members of those startups
    else if (
      announcement.scope ===
        "STARTUP_SPECIFIC" ||
  
      announcement.scope ===
        "CUSTOM"
    ) {
  
      const includedStartupIds =
        announcement.targets
          .filter(
            (t) =>
              t.targetType ===
                "STARTUP" &&
              !t.isExcluded
          )
          .map(
            (t) => t.targetId
          );
  
      const excludedStartupIds =
        announcement.targets
          .filter(
            (t) =>
              t.targetType ===
                "STARTUP" &&
              t.isExcluded
          )
          .map(
            (t) => t.targetId
          );
  
      if (
        includedStartupIds.length >
        0
      ) {
  
        const members =
          await db.startupMember.findMany({
            where: {
              startupId: {
                in: includedStartupIds,
  
                notIn:
                  excludedStartupIds,
              },
  
              isActive: true,
            },
  
            select: {
              userId: true,
            },
          });
  
        members.forEach((m) =>
          recipientIds.add(
            m.userId
          )
        );
      }
  
      // direct users
      const directUsers =
        announcement.targets
          .filter(
            (t) =>
              t.targetType ===
                "USER" &&
              !t.isExcluded
          )
          .map(
            (t) => t.targetId
          );
  
      directUsers.forEach((id) =>
        recipientIds.add(id)
      );
  
      // excluded users
      const excludedUsers =
        announcement.targets
          .filter(
            (t) =>
              t.targetType ===
                "USER" &&
              t.isExcluded
          )
          .map(
            (t) => t.targetId
          );
  
      excludedUsers.forEach((id) =>
        recipientIds.delete(id)
      );
    }
  
    recipientIds.delete(userId);

    const actor =
      await db.incubationUser.findUnique({
        where: {
          id: userId,
        },

        select: {
          userId: true,
          name: true,
          imageUrl: true,
        },
      });

  
  
    if (recipientIds.size > 0) {
  
      await NotificationService.sendBulk({
        recipientIds:
          [...recipientIds],
        type:
          "ANNOUNCEMENT_PUBLISHED",
        category:
          "INCUBATION",
        priority:
          announcement.priority ===
          "URGENT"
            ? "URGENT"
            : announcement.priority ===
              "HIGH"
            ? "HIGH"
            : "MEDIUM",
        title:
          announcement.title,
        message:
          announcement.content.length >
          120
            ? `${announcement.content.slice(
                0,
                120
              )}...`
            : announcement.content,
        actorId:
          actor?.userId || null,
        actorName:
          actor?.name || null,
        actorAvatar:
          actor?.imageUrl || null,
        entityType:
          "ANNOUNCEMENT",
        entityId:
          announcement.id,
        actionUrl:
          `/announcements`,
        data: {
          announcementId:
            announcement.id,
          scope:
            announcement.scope,
          priority:
            announcement.priority,
        },
      }).catch((err) => {
        console.error(
          "Announcement notification failed:",
          err
        );
      });
    }

    this.sendAnnouncementEmails(announcement, tenant).catch((err) => {
      console.error("Failed to send announcement emails:", err);
    });

    return this.getAnnouncementById({ announcementId, tenantKey });
  },

  async unpublishAnnouncement({ announcementId, tenantKey, userId }) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(400, "Invalid tenantKey - tenant not found");

    const announcement = await db.announcement.findFirst({
      where: { id: announcementId, ownerType: "INCUBATION", ownerId: tenant.id },
    });
    if (!announcement) throw new ApiError(404, "Announcement not found");

    await db.announcement.update({
      where: { id: announcementId },
      data: { isPublished: false, publishedAt: null },
    });

    await announcementActivityService.logActivity({
      announcementId,
      actorId: userId,
      actorType: "INCUBATION_USER",
      action: "UNPUBLISHED",
    });

    return this.getAnnouncementById({ announcementId, tenantKey });
  },

  async pinAnnouncement({ announcementId, tenantKey, userId }) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(400, "Invalid tenantKey - tenant not found");

    const announcement = await db.announcement.findFirst({
      where: { id: announcementId, ownerType: "INCUBATION", ownerId: tenant.id },
    });
    if (!announcement) throw new ApiError(404, "Announcement not found");

    await db.announcement.update({
      where: { id: announcementId },
      data: { isPinned: true, pinnedAt: new Date() },
    });

    await announcementActivityService.logActivity({
      announcementId,
      actorId: userId,
      actorType: "INCUBATION_USER",
      action: "PINNED",
    });

    return this.getAnnouncementById({ announcementId, tenantKey });
  },

  async unpinAnnouncement({ announcementId, tenantKey, userId }) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(400, "Invalid tenantKey - tenant not found");

    const announcement = await db.announcement.findFirst({
      where: { id: announcementId, ownerType: "INCUBATION", ownerId: tenant.id },
    });
    if (!announcement) throw new ApiError(404, "Announcement not found");

    await db.announcement.update({
      where: { id: announcementId },
      data: { isPinned: false, pinnedAt: null },
    });

    await announcementActivityService.logActivity({
      announcementId,
      actorId: userId,
      actorType: "INCUBATION_USER",
      action: "UNPINNED",
    });

    return this.getAnnouncementById({ announcementId, tenantKey });
  },

  async restoreAnnouncement({ announcementId, tenantKey, userId }) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(400, "Invalid tenantKey - tenant not found");

    const announcement = await db.announcement.findFirst({
      where: { id: announcementId, ownerType: "INCUBATION", ownerId: tenant.id, isArchived: true },
    });
    if (!announcement) throw new ApiError(404, "Archived announcement not found");

    await db.announcement.update({
      where: { id: announcementId },
      data: { isArchived: false, archivedAt: null },
    });

    await announcementActivityService.logActivity({
      announcementId,
      actorId: userId,
      actorType: "INCUBATION_USER",
      action: "RESTORED",
    });

    return this.getAnnouncementById({ announcementId, tenantKey });
  },

  async getAnnouncementStats({ tenantKey }) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(400, "Invalid tenantKey - tenant not found");

    const baseWhere = { ownerType: "INCUBATION", ownerId: tenant.id, isArchived: false };

    const [total, published, draft, pinned, byScope, byPriority, byVisibility] = await Promise.all([
      db.announcement.count({ where: baseWhere }),
      db.announcement.count({ where: { ...baseWhere, isPublished: true } }),
      db.announcement.count({ where: { ...baseWhere, isPublished: false } }),
      db.announcement.count({ where: { ...baseWhere, isPinned: true } }),
      db.announcement.groupBy({ by: ["scope"], where: baseWhere, _count: true }),
      db.announcement.groupBy({ by: ["priority"], where: baseWhere, _count: true }),
      db.announcement.groupBy({ by: ["visibility"], where: baseWhere, _count: true }),
    ]);

    return {
      total,
      published,
      draft,
      pinned,
      byScope: byScope.reduce((acc, s) => ({ ...acc, [s.scope]: s._count }), {}),
      byPriority: byPriority.reduce((acc, p) => ({ ...acc, [p.priority]: p._count }), {}),
      byVisibility: byVisibility.reduce((acc, v) => ({ ...acc, [v.visibility]: v._count }), {}),
    };
  },

  async getAnnouncementReads({ announcementId, tenantKey, page = 1, limit = 20 }) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(400, "Invalid tenantKey - tenant not found");

    const announcement = await db.announcement.findFirst({
      where: { id: announcementId, ownerType: "INCUBATION", ownerId: tenant.id },
    });
    if (!announcement) throw new ApiError(404, "Announcement not found");

    const skip = (page - 1) * limit;
    const [reads, total] = await Promise.all([
      db.announcementRead.findMany({
        where: { announcementId },
        skip,
        take: Number(limit),
        orderBy: { readAt: "desc" },
      }),
      db.announcementRead.count({ where: { announcementId } }),
    ]);

    const readsWithInfo = await Promise.all(
      reads.map(async (read) => {
        const reader = await this.getCreatorInfo(read.readerId, read.readerType);
        return { ...read, reader };
      })
    );

    return {
      reads: readsWithInfo,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  },

  async getCreatorInfo(creatorId, creatorType) {
    if (creatorType === "INCUBATION_USER") {
      const user = await db.incubationUser.findUnique({
        where: { id: creatorId },
        select: { id: true, name: true, email: true, imageUrl: true },
      });
      return user;
    } else if (creatorType === "USER") {
      const user = await db.user.findUnique({
        where: { id: creatorId },
        select: { id: true, firstName: true, lastName: true, email: true, profilePhoto: true },
      });
      if (user) {
        return { id: user.id, name: `${user.firstName} ${user.lastName}`, email: user.email, imageUrl: user.profilePhoto };
      }
    } else if (creatorType === "STARTUP_MEMBER") {
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
    }
    return null;
  },

  async sendAnnouncementEmails(announcement, tenant) {
    const emails = await announcementTargetService.resolveTargetEmails(announcement, tenant.id);
    if (emails.length === 0) return;

    const creator = await this.getCreatorInfo(announcement.creatorId, announcement.creatorType);
    const announcementData = {
      title: announcement.title,
      content: announcement.content,
      createdBy: creator?.name || "System Administrator",
      programName: announcement.program?.title || null,
      scope: announcement.scope,
      tenantName: tenant.organizationName || "Incubation Portal",
      date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    };

    return announcementEmailService.sendAnnouncementEmails(emails, announcementData);
  },
};
