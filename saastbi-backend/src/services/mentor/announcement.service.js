import db from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";
import { buildQueryOptions } from "../../utils/queryHelper.js";

const getMentorProfile = async (userId) => {
  const profile = await db.mentorProfile.findFirst({
    where: { userId },
  });
  if (!profile) {
    throw new ApiError(404, "Mentor profile not found");
  }
  return profile;
};

export const mentorAnnouncementService = {
  async getReceivedAnnouncements({ userId, filters = {}, pagination = {} }) {
    const mentorProfile = await getMentorProfile(userId);

    const { tenantId, isRead, priority, search } = filters;
    const { page = 1, limit = 10, sortBy = "publishedAt", order = "desc" } = pagination;

    const associations = await db.incubatorMentorAssociation.findMany({
      where: { mentorProfileId: mentorProfile.id, status: "ACTIVE" },
      select: { id: true, tenantId: true },
    });

    if (associations.length === 0) {
      return {
        announcements: [],
        total: 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: 0,
      };
    }

    const tenantIds = associations.map((a) => a.tenantId);
    const associationIds = associations.map((a) => a.id);

    const baseConditions = {
      ownerType: "INCUBATION",
      isPublished: true,
      isArchived: false,
      OR: [
        { ownerId: { in: tenantIds }, scope: "TENANT_WIDE" },
        { ownerId: { in: tenantIds }, scope: "MENTOR_SPECIFIC" },
        {
          targets: {
            some: {
              targetType: "MENTOR",
              targetId: { in: associationIds },
              isExcluded: false,
            },
          },
        },
      ],
      NOT: {
        targets: {
          some: {
            targetType: "MENTOR",
            targetId: { in: associationIds },
            isExcluded: true,
          },
        },
      },
    };

    if (tenantId) {
      baseConditions.ownerId = tenantId;
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
            where: { readerId: mentorProfile.id, readerType: "USER" },
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

  async getReceivedAnnouncementById({ userId, announcementId }) {
    const mentorProfile = await getMentorProfile(userId);

    const associations = await db.incubatorMentorAssociation.findMany({
      where: { mentorProfileId: mentorProfile.id, status: "ACTIVE" },
      select: { id: true, tenantId: true },
    });

    const tenantIds = associations.map((a) => a.tenantId);
    const associationIds = associations.map((a) => a.id);

    const announcement = await db.announcement.findFirst({
      where: {
        id: announcementId,
        ownerType: "INCUBATION",
        isPublished: true,
        isArchived: false,
        OR: [
          { ownerId: { in: tenantIds }, scope: "TENANT_WIDE" },
          { ownerId: { in: tenantIds }, scope: "MENTOR_SPECIFIC" },
          {
            targets: {
              some: {
                targetType: "MENTOR",
                targetId: { in: associationIds },
                isExcluded: false,
              },
            },
          },
        ],
        NOT: {
          targets: {
            some: {
              targetType: "MENTOR",
              targetId: { in: associationIds },
              isExcluded: true,
            },
          },
        },
      },
      include: {
        program: { select: { id: true, title: true } },
        attachments: true,
        reads: {
          where: { readerId: mentorProfile.id, readerType: "USER" },
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

  async markAsRead({ userId, announcementId }) {
    const mentorProfile = await getMentorProfile(userId);

    await this.getReceivedAnnouncementById({ userId, announcementId });

    const existing = await db.announcementRead.findFirst({
      where: {
        announcementId,
        readerId: mentorProfile.id,
        readerType: "USER",
      },
    });

    if (!existing) {
      await db.announcementRead.create({
        data: {
          announcementId,
          readerId: mentorProfile.id,
          readerType: "USER",
        },
      });
    }

    return { message: "Marked as read" };
  },

  async getUnreadCount({ userId }) {
    const mentorProfile = await getMentorProfile(userId);

    const associations = await db.incubatorMentorAssociation.findMany({
      where: { mentorProfileId: mentorProfile.id, status: "ACTIVE" },
      select: { id: true, tenantId: true },
    });

    if (associations.length === 0) {
      return { unreadCount: 0, totalCount: 0 };
    }

    const tenantIds = associations.map((a) => a.tenantId);
    const associationIds = associations.map((a) => a.id);

    const allAnnouncements = await db.announcement.findMany({
      where: {
        ownerType: "INCUBATION",
        isPublished: true,
        isArchived: false,
        OR: [
          { ownerId: { in: tenantIds }, scope: "TENANT_WIDE" },
          { ownerId: { in: tenantIds }, scope: "MENTOR_SPECIFIC" },
          {
            targets: {
              some: {
                targetType: "MENTOR",
                targetId: { in: associationIds },
                isExcluded: false,
              },
            },
          },
        ],
        NOT: {
          targets: {
            some: {
              targetType: "MENTOR",
              targetId: { in: associationIds },
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
        readerId: mentorProfile.id,
        readerType: "USER",
      },
      select: { announcementId: true },
    });

    const readIds = new Set(readAnnouncements.map((r) => r.announcementId));
    const unreadCount = announcementIds.filter((id) => !readIds.has(id)).length;

    return { unreadCount, totalCount: announcementIds.length };
  },

  async getAnnouncementsByIncubator({ userId, tenantId, pagination = {} }) {
    const mentorProfile = await getMentorProfile(userId);
    const { page = 1, limit = 10, sortBy = "publishedAt", order = "desc" } = pagination;

    const association = await db.incubatorMentorAssociation.findFirst({
      where: { mentorProfileId: mentorProfile.id, tenantId, status: "ACTIVE" },
    });

    if (!association) {
      throw new ApiError(403, "You are not associated with this incubator");
    }

    const where = {
      ownerType: "INCUBATION",
      ownerId: tenantId,
      isPublished: true,
      isArchived: false,
      OR: [
        { scope: "TENANT_WIDE" },
        { scope: "MENTOR_SPECIFIC" },
        {
          targets: {
            some: {
              targetType: "MENTOR",
              targetId: association.id,
              isExcluded: false,
            },
          },
        },
      ],
      NOT: {
        targets: {
          some: {
            targetType: "MENTOR",
            targetId: association.id,
            isExcluded: true,
          },
        },
      },
    };

    const skip = (page - 1) * limit;

    const [announcements, total] = await Promise.all([
      db.announcement.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ isPinned: "desc" }, { [sortBy]: order }],
        include: {
          program: { select: { id: true, title: true } },
          attachments: true,
          reads: {
            where: { readerId: mentorProfile.id, readerType: "USER" },
            take: 1,
          },
        },
      }),
      db.announcement.count({ where }),
    ]);

    const enriched = await Promise.all(
      announcements.map(async (ann) => {
        const creator = await this.getCreatorInfo(ann.creatorId, ann.creatorType);
        return {
          ...ann,
          creator,
          isRead: ann.reads.length > 0,
          reads: undefined,
        };
      })
    );

    return {
      announcements: enriched,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
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
