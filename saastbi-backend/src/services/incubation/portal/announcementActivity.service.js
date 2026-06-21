import db from "../../../db/db.js";

export const announcementActivityService = {
  async logActivity({ announcementId, actorId, actorType, action, field, oldValue, newValue, metadata }) {
    return db.announcementActivity.create({
      data: {
        announcementId,
        actorId,
        actorType,
        action,
        field,
        oldValue,
        newValue,
        metadata,
      },
    });
  },

  async getActivities(announcementId, { page = 1, limit = 20 } = {}) {
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      db.announcementActivity.findMany({
        where: { announcementId },
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
      }),
      db.announcementActivity.count({ where: { announcementId } }),
    ]);

    const activitiesWithActor = await Promise.all(
      activities.map(async (activity) => {
        const actor = await this.getActorInfo(activity.actorId, activity.actorType);
        return { ...activity, actor };
      })
    );

    return {
      activities: activitiesWithActor,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  },

  async getActorInfo(actorId, actorType) {
    if (actorType === "INCUBATION_USER") {
      return db.incubationUser.findUnique({
        where: { id: actorId },
        select: { id: true, name: true, email: true, imageUrl: true },
      });
    } else if (actorType === "USER") {
      const user = await db.user.findUnique({
        where: { id: actorId },
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
    } else if (actorType === "STARTUP_MEMBER") {
      const member = await db.startupMember.findUnique({
        where: { id: actorId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, profilePhoto: true } },
        },
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
};
