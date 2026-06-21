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

export const startupReceivedAnnouncementService = {
  async getReceivedAnnouncements({ startupId, userId, filters = {}, pagination = {} }) {
    if (!startupId) throw new ApiError(400, "startupId required");
    const member = await verifyStartupAccess(userId, startupId);

    const { source, programId, isRead, priority, search } = filters;
    const { page = 1, limit = 10, sortBy = "publishedAt", order = "desc" } = pagination;

    const startup = await db.startup.findUnique({
      where: { id: startupId },
      include: {
        tenantAssociations: { select: { tenantId: true } },
        programAssociations: { select: { programId: true } },
      },
    });
    if (!startup) throw new ApiError(404, "Startup not found");

    const tenantIds = startup.tenantAssociations.map((t) => t.tenantId);
    const programIds = startup.programAssociations.map((p) => p.programId);

    const baseConditions = {
      ownerType: "INCUBATION",
      isPublished: true,
      isArchived: false,
      OR: [
        { ownerId: { in: tenantIds }, scope: "TENANT_WIDE" },
        { ownerId: { in: tenantIds }, scope: "STARTUP_SPECIFIC" },
        { programId: { in: programIds }, scope: "PROGRAM_SPECIFIC" },
        {
          targets: {
            some: {
              targetType: "STARTUP",
              targetId: startupId,
              isExcluded: false,
            },
          },
        },
        {
          targets: {
            some: {
              targetType: "PROGRAM",
              targetId: { in: programIds },
              isExcluded: false,
            },
          },
        },
      ],
      NOT: {
        targets: {
          some: {
            targetType: "STARTUP",
            targetId: startupId,
            isExcluded: true,
          },
        },
      },
    };

    if (source === "TENANT") {
      baseConditions.scope = { in: ["TENANT_WIDE", "STARTUP_SPECIFIC"] };
    } else if (source === "PROGRAM") {
      baseConditions.scope = "PROGRAM_SPECIFIC";
    }

    if (programId) {
      baseConditions.programId = programId;
    }

    if (priority) {
      baseConditions.priority = priority;
    }

    const { skip, take, where: searchWhere } = buildQueryOptions({
      page,
      limit,
      search,
      searchFields: ["title", "content"],
      sortBy,
      order,
    });

    const where = { ...baseConditions, ...searchWhere };

    const [announcements, total] = await Promise.all([
      db.announcement.findMany({
        where,
        skip,
        take,
        orderBy: [{ isPinned: "desc" }, { pinnedAt: "desc" }, { [sortBy]: order }],
        include: {
          program: { select: { id: true, title: true } },
          attachments: true,
          reads: {
            where: { readerId: member.id, readerType: "STARTUP_MEMBER" },
            take: 1,
          },
        },
      }),
      db.announcement.count({ where }),
    ]);

    const enrichedAnnouncements = await Promise.all(
      announcements.map(async (ann) => {
        const tenant = await db.tenant.findUnique({
          where: { id: ann.ownerId },
          select: { id: true, organizationName: true, tenantLogo: true },
        });

        const creator = await this.getCreatorInfo(ann.creatorId, ann.creatorType);
        const isReadByUser = ann.reads.length > 0;

        return {
          ...ann,
          tenant,
          creator,
          isRead: isReadByUser,
          reads: undefined,
        };
      })
    );

    let filtered = enrichedAnnouncements;
    if (isRead === "true") {
      filtered = enrichedAnnouncements.filter((a) => a.isRead);
    } else if (isRead === "false") {
      filtered = enrichedAnnouncements.filter((a) => !a.isRead);
    }

    return {
      announcements: filtered,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  },

  async getReceivedAnnouncementById({ startupId, announcementId, userId }) {
    const member = await verifyStartupAccess(userId, startupId);

    const startup = await db.startup.findUnique({
      where: { id: startupId },
      include: {
        tenantAssociations: { select: { tenantId: true } },
        programAssociations: { select: { programId: true } },
      },
    });
    if (!startup) throw new ApiError(404, "Startup not found");

    const tenantIds = startup.tenantAssociations.map((t) => t.tenantId);
    const programIds = startup.programAssociations.map((p) => p.programId);

    const announcement = await db.announcement.findFirst({
      where: {
        id: announcementId,
        ownerType: "INCUBATION",
        isPublished: true,
        isArchived: false,
        OR: [
          { ownerId: { in: tenantIds }, scope: "TENANT_WIDE" },
          { ownerId: { in: tenantIds }, scope: "STARTUP_SPECIFIC" },
          { programId: { in: programIds }, scope: "PROGRAM_SPECIFIC" },
          {
            targets: {
              some: {
                targetType: "STARTUP",
                targetId: startupId,
                isExcluded: false,
              },
            },
          },
        ],
        NOT: {
          targets: {
            some: {
              targetType: "STARTUP",
              targetId: startupId,
              isExcluded: true,
            },
          },
        },
      },
      include: {
        program: { select: { id: true, title: true } },
        attachments: true,
        reads: {
          where: { readerId: member.id, readerType: "STARTUP_MEMBER" },
          take: 1,
        },
      },
    });

    if (!announcement) {
      throw new ApiError(404, "Announcement not found or access denied");
    }

    const tenant = await db.tenant.findUnique({
      where: { id: announcement.ownerId },
      select: { id: true, organizationName: true, tenantLogo: true },
    });

    const creator = await this.getCreatorInfo(announcement.creatorId, announcement.creatorType);
    const isReadByUser = announcement.reads.length > 0;

    return {
      announcement: {
        ...announcement,
        tenant,
        creator,
        isRead: isReadByUser,
        reads: undefined,
      },
    };
  },

  async markAsRead({ startupId, announcementId, userId }) {
    const member = await verifyStartupAccess(userId, startupId);

    const result = await this.getReceivedAnnouncementById({ startupId, announcementId, userId });
    if (!result.announcement) {
      throw new ApiError(404, "Announcement not found");
    }

    const existing = await db.announcementRead.findFirst({
      where: {
        announcementId,
        readerId: member.id,
        readerType: "STARTUP_MEMBER",
      },
    });

    if (!existing) {
      await db.announcementRead.create({
        data: {
          announcementId,
          readerId: member.id,
          readerType: "STARTUP_MEMBER",
        },
      });
    }

    return { message: "Marked as read" };
  },

  async getUnreadCount({ startupId, userId }) {
    const member = await verifyStartupAccess(userId, startupId);

    const startup = await db.startup.findUnique({
      where: { id: startupId },
      include: {
        tenantAssociations: { select: { tenantId: true } },
        programAssociations: { select: { programId: true } },
      },
    });
    if (!startup) throw new ApiError(404, "Startup not found");

    const tenantIds = startup.tenantAssociations.map((t) => t.tenantId);
    const programIds = startup.programAssociations.map((p) => p.programId);

    const allAnnouncements = await db.announcement.findMany({
      where: {
        ownerType: "INCUBATION",
        isPublished: true,
        isArchived: false,
        OR: [
          { ownerId: { in: tenantIds }, scope: "TENANT_WIDE" },
          { ownerId: { in: tenantIds }, scope: "STARTUP_SPECIFIC" },
          { programId: { in: programIds }, scope: "PROGRAM_SPECIFIC" },
          {
            targets: {
              some: {
                targetType: "STARTUP",
                targetId: startupId,
                isExcluded: false,
              },
            },
          },
        ],
        NOT: {
          targets: {
            some: {
              targetType: "STARTUP",
              targetId: startupId,
              isExcluded: true,
            },
          },
        },
      },
      select: { id: true },
    });

    const announcementIds = allAnnouncements.map((a) => a.id);

    const readAnnouncements = await db.announcementRead.findMany({
      where: {
        announcementId: { in: announcementIds },
        readerId: member.id,
        readerType: "STARTUP_MEMBER",
      },
      select: { announcementId: true },
    });

    const readIds = new Set(readAnnouncements.map((r) => r.announcementId));
    const unreadCount = announcementIds.filter((id) => !readIds.has(id)).length;

    return { unreadCount, totalCount: announcementIds.length };
  },

  async getCreatorInfo(creatorId, creatorType) {
    if (creatorType === "INCUBATION_USER") {
      return db.incubationUser.findUnique({
        where: { id: creatorId },
        select: { id: true, name: true, email: true, imageUrl: true },
      });
    } else if (creatorType === "USER") {
      const user = await db.user.findUnique({
        where: { id: creatorId },
        select: { id: true, firstName: true, lastName: true, email: true, profilePhoto: true },
      });
      if (user) {
        return {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          imageUrl: user.profilePhoto,
        };
      }
    }
    return null;
  },
};
