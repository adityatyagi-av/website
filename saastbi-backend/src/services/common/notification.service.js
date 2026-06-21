import db from "../../db/db.js";
import sendMail from "../../config/sendMail.js";
import path from "path";

let emitToUserFn = null;

export function setSocketEmitter(fn) {
  emitToUserFn = fn;
}

const EMAIL_TEMPLATE_MAP = {
  SESSION_BOOKED: "notifications/session-booked.ejs",
  SESSION_CANCELLED: "notifications/session-cancelled.ejs",
  SESSION_REMINDER: "notifications/session-reminder.ejs",
  MENTORSHIP_REQUEST: "notifications/mentorship-request.ejs",
  APPLICATION_STATUS_CHANGED: "notifications/application-status.ejs",
  TASK_ASSIGNED: "notifications/task-assigned.ejs",
  EVENT_REMINDER: "event-reminder.ejs",
  SYSTEM: "login-alert.ejs",
  ADD_STARTUP_CREDENTIALS: "add-startup-credentials.ejs",
  COMMUNITY_INVITE:"community-invite.ejs"
};

const GROUP_WINDOW_MS = 15 * 60 * 1000;

function resolveEmailTemplate(type) {
  return EMAIL_TEMPLATE_MAP[type] || null;
}

async function checkIsBlocked(recipientId, actorId) {
  if (!actorId) return false;
  const block = await db.userBlock.findUnique({
    where: {
      blockerId_blockedId: { blockerId: recipientId, blockedId: actorId },
    },
    select: { id: true },
  });
  console.log("block:",block);
  return !!block;
}

async function getChannelPreferences(userId, category) {
  const globalSettings = await db.userSettings.findUnique({
    where: { userId },
    select: { emailNotifications: true, pushNotifications: true },
  });

  const categoryPref = await db.notificationPreference.findUnique({
    where: { userId_category: { userId, category } },
    select: { inApp: true, email: true, push: true },
  });

  const globalEmail = globalSettings?.emailNotifications ?? true;
  const globalPush = globalSettings?.pushNotifications ?? true;

  return {
    inApp: categoryPref?.inApp ?? true,
    email: (categoryPref?.email ?? true) && globalEmail,
    push: (categoryPref?.push ?? false) && globalPush,
  };
}

async function dispatchEmail(recipientId, type, title, message, data) {
  const templateFile = resolveEmailTemplate(type);
  if (!templateFile) return;

  try {
    const user = await db.user.findUnique({
      where: { id: recipientId },
      select: { email: true, firstName: true },
    });
    if (!user) return;

    const templatePath = path.resolve(`./src/mails/${templateFile}`);
    const templateData = {
      firstName: user.firstName,
      title,
      message,
      ...(data || {}),
    };

    await sendMail(user.email, title, templatePath, templateData);
  } catch (error) {
    console.error("Notification email dispatch failed:", error.message);
  }
}

function emitNotification(userId, event, data) {
  if (emitToUserFn) {
    try {
      emitToUserFn(userId, event, data);
    } catch (error) {
      console.error("Notification socket emit failed:", error.message);
    }
  }
}

export const NotificationService = {
  send: async ({
    recipientId,
    type,
    category,
    priority,
    title,
    message,
    data = null,
    actionUrl = null,
    actorId = null,
    actorName = null,
    actorAvatar = null,
    entityType = null,
    entityId = null,
    groupKey = null,r
  }) => {
    try {
      console.log("send actor id:",actorId);
      console.log("send recipientid:",recipientId)
    
      if (actorId && actorId === recipientId) return null;

      if (await checkIsBlocked(recipientId, actorId)) return null;
      console.log("after check is block:")

      const channels = await getChannelPreferences(recipientId, category);
      console.log("channels:",channels)

      //if (!channels.inApp) return null;
      let notification=null;
      if(channels.inApp){
        notification = await db.notification.create({
          data: {
            userId: recipientId,
            type,
            category,
            priority,
            title,
            message,
            data: data || undefined,
            actionUrl,
            actorId,
            actorName,
            actorAvatar,
            entityType,
            entityId,
            groupKey,
          },
        });
      emitNotification(recipientId, "notification:new", notification);
    }
      if (channels.email) {
        dispatchEmail(recipientId, type, title, message, data).catch(() => {});
      }

      return notification;
    } catch (error) {
      console.error("NotificationService.send failed:", error.message);
      return null;
    }
  },

  sendBulk: async ({ recipientIds, type, category = "SYSTEM", priority = "MEDIUM", title, message, data = null, actionUrl = null, actorId = null, actorName = null, actorAvatar = null, entityType = null, entityId = null }) => {
    const batchSize = 50;
    const results = [];

    for (let i = 0; i < recipientIds.length; i += batchSize) {
      const batch = recipientIds.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map((recipientId) =>
          NotificationService.send({
            recipientId,
            type,
            category,
            priority,
            title,
            message,
            data,
            actionUrl,
            actorId,
            actorName,
            actorAvatar,
            entityType,
            entityId,
          })
        )
      );
      results.push(...batchResults);
    }
    console.log("results:",results)

    return results;
  },

  sendToTenant: async ({
    tenantId,
  
    type,
    category = "SYSTEM",
    priority = "MEDIUM",
  
    title,
    message,
  
    data = null,
    actionUrl = null,
  
    actorId = null,
    actorName = null,
    actorAvatar = null,
  
    entityType = null,
    entityId = null,
  }) => {
  
    console.log("tenant id:", tenantId);
    //console.log("INCUBATION USERS:", incubationUsers);
    console.log("ACTOR ID:", actorId);
  
    const incubationUsers =
      await db.incubationUser.findMany({
        where: {
          isActive: true,
  
          tenantMemberships: {
            some: {
              tenantId,
            },
          },
        },
  
        select: {
          userId: true,
        },
      });

    console.log("incubation users:",incubationUsers)
  
    const recipientIds = [
      ...new Set(
        incubationUsers
          .map((u) => u.userId)
          .filter(Boolean),
      ),
    ];

    console.log("receept id:",recipientIds)
  
  
    if (recipientIds.length === 0) {
      return [];
    }
  
    return NotificationService.sendBulk({
      recipientIds,
  
      type,
      category,
      priority,
  
      title,
      message,
  
      data,
      actionUrl,
  
      actorId,
      actorName,
      actorAvatar,
  
      entityType,
      entityId,
    });
  },

  sendGrouped: async ({ recipientId, type, category = "SYSTEM", priority = "MEDIUM", title, message, data = null, actionUrl = null, actorId = null, actorName = null, actorAvatar = null, entityType = null, entityId = null, groupKey }) => {
    try {
      if (actorId && actorId === recipientId) return null;

      if (await checkIsBlocked(recipientId, actorId)) return null;

      const channels = await getChannelPreferences(recipientId, category);
      if (!channels.inApp) return null;

      const windowStart = new Date(Date.now() - GROUP_WINDOW_MS);

      const existing = await db.notification.findFirst({
        where: {
          userId: recipientId,
          groupKey,
          isRead: false,
          isArchived: false,
          createdAt: { gte: windowStart },
        },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        const existingData = (existing.data && typeof existing.data === "object") ? existing.data : {};
        const actors = Array.isArray(existingData.actors) ? existingData.actors : [];

        if (actorId && !actors.find((a) => a.id === actorId)) {
          actors.push({ id: actorId, name: actorName, avatar: actorAvatar });
        }

        const actorCount = actors.length;
        let updatedMessage = message;
        if (actorCount > 1) {
          const firstName = actors[0]?.name || "Someone";
          updatedMessage = `${firstName} and ${actorCount - 1} other${actorCount - 1 > 1 ? "s" : ""} ${message}`;
        }

        const updated = await db.notification.update({
          where: { id: existing.id },
          data: {
            message: updatedMessage,
            actorName: actors[0]?.name || actorName,
            data: { ...existingData, actors, count: actorCount },
          },
        });

        emitNotification(recipientId, "notification:updated", updated);
        return updated;
      }

      const initialActors = actorId ? [{ id: actorId, name: actorName, avatar: actorAvatar }] : [];

      return NotificationService.send({
        recipientId,
        type,
        category,
        priority,
        title,
        message,
        data: { ...(data || {}), actors: initialActors, count: 1 },
        actionUrl,
        actorId,
        actorName,
        actorAvatar,
        entityType,
        entityId,
        groupKey,
      });
    } catch (error) {
      console.error("NotificationService.sendGrouped failed:", error.message);
      return null;
    }
  },

  getNotifications: async ({ userId, category, isRead, type, page = 1, limit = 20 }) => {
    const where = { userId, isArchived: false };

    if (category) where.category = category;
    if (typeof isRead === "boolean") where.isRead = isRead;
    if (type) where.type = type;

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.notification.count({ where }),
    ]);

    const actorIds = [...new Set(notifications.map((n) => n.actorId).filter(Boolean))];
    const pageEntityIds = [...new Set(
      notifications
        .filter((n) => ["Page", "Job", "Event"].includes(n.entityType))
        .map((n) => n.entityId)
        .filter(Boolean)
    )];

    const [actorUsers, relatedPages] = await Promise.all([
      actorIds.length > 0
        ? db.user.findMany({
            where: { id: { in: actorIds } },
            select: { id: true, username: true },
          })
        : [],
      pageEntityIds.length > 0
        ? db.page.findMany({
            where: { id: { in: pageEntityIds } },
            select: { id: true, slug: true },
          })
        : [],
    ]);

    const actorSlugMap = Object.fromEntries(actorUsers.map((u) => [u.id, u.username]));
    const pageSlugMap = Object.fromEntries(relatedPages.map((p) => [p.id, p.slug]));

    const enriched = notifications.map((n) => ({
      ...n,
      actorSlug: n.data?.actorSlug || actorSlugMap[n.actorId] || null,
      entitySlug: pageSlugMap[n.entityId] || null,
    }));

    return {
      notifications: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  getUnreadCount: async (userId) => {
    const [total, byCategory] = await Promise.all([
      db.notification.count({
        where: { userId, isRead: false, isArchived: false },
      }),
      db.notification.groupBy({
        by: ["category"],
        where: { userId, isRead: false, isArchived: false },
        _count: { id: true },
      }),
    ]);

    const categories = {};
    for (const group of byCategory) {
      categories[group.category] = group._count.id;
    }

    return { total, categories };
  },

  getById: async (notificationId, userId) => {
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      return null;
    }

    let actorSlug = notification.data?.actorSlug || null;
    if (!actorSlug && notification.actorId) {
      const actor = await db.user.findUnique({
        where: { id: notification.actorId },
        select: { username: true },
      });
      actorSlug = actor?.username || null;
    }

    let entitySlug = null;
    if (["Page", "Job", "Event"].includes(notification.entityType) && notification.entityId) {
      const page = await db.page.findUnique({
        where: { id: notification.entityId },
        select: { slug: true },
      });
      entitySlug = page?.slug || null;
    }

    return { ...notification, actorSlug, entitySlug };
  },

  markAsRead: async (notificationId, userId) => {
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
      select: { id: true, userId: true },
    });

    if (!notification || notification.userId !== userId) {
      return null;
    }

    const updated = await db.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });

    const unreadCount = await NotificationService.getUnreadCount(userId);
    emitNotification(userId, "notification:unread-count", unreadCount);

    return updated;
  },

  markAllAsRead: async (userId, category = null) => {
    const where = { userId, isRead: false, isArchived: false };
    if (category) where.category = category;

    await db.notification.updateMany({
      where,
      data: { isRead: true, readAt: new Date() },
    });

    const unreadCount = await NotificationService.getUnreadCount(userId);
    emitNotification(userId, "notification:unread-count", unreadCount);

    return { success: true };
  },

  archiveNotification: async (notificationId, userId) => {
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
      select: { id: true, userId: true },
    });

    if (!notification || notification.userId !== userId) {
      return null;
    }

    const updated = await db.notification.update({
      where: { id: notificationId },
      data: { isArchived: true },
    });

    const unreadCount = await NotificationService.getUnreadCount(userId);
    emitNotification(userId, "notification:unread-count", unreadCount);

    return updated;
  },

  clearArchived: async (userId) => {
    const result = await db.notification.deleteMany({
      where: { userId, isArchived: true },
    });

    return { deleted: result.count };
  },

  getPreferences: async (userId) => {
    const ALL_CATEGORIES = [
      "SOCIAL", "COMMUNITY", "MENTORSHIP", "INCUBATION", "STARTUP",
      "JOB", "EVENT", "TASK", "OFFICE", "FUNDING", "PAYMENT", "SYSTEM",
    ];

    const existing = await db.notificationPreference.findMany({
      where: { userId },
    });

    const prefMap = {};
    for (const pref of existing) {
      prefMap[pref.category] = pref;
    }

    return ALL_CATEGORIES.map((cat) => ({
      category: cat,
      inApp: prefMap[cat]?.inApp ?? true,
      email: prefMap[cat]?.email ?? true,
      push: prefMap[cat]?.push ?? false,
    }));
  },

  updatePreferences: async (userId, preferences) => {
    const results = await Promise.allSettled(
      preferences.map((pref) =>
        db.notificationPreference.upsert({
          where: { userId_category: { userId, category: pref.category } },
          update: {
            inApp: pref.inApp,
            email: pref.email,
            push: pref.push,
          },
          create: {
            userId,
            category: pref.category,
            inApp: pref.inApp,
            email: pref.email,
            push: pref.push,
          },
        })
      )
    );

    return NotificationService.getPreferences(userId);
  },
};
