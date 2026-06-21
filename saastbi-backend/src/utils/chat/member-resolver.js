import db from "../../db/db.js";

/**
 * Get all real user IDs who should have access to an entity's conversations.
 */
export async function getEntityMemberUserIds(entityId, entityType) {
  switch (entityType) {
    case "STARTUP": {
      const members = await db.startupMember.findMany({
        where: { startupId: entityId, isActive: true },
        select: { userId: true },
      });
      return members.map((m) => m.userId);
    }

    case "PAGE": {
      const members = await db.pageMember.findMany({
        where: { pageId: entityId },
        select: { userId: true },
      });
      return members.map((m) => m.userId);
    }

    case "TENANT": {
      const members = await db.incubationUserTenant.findMany({
        where: { tenantId: entityId, isActive: true },
        include: { incubationUser: { select: { userId: true } } },
      });
      return members
        .map((m) => m.incubationUser?.userId)
        .filter(Boolean);
    }

    case "INCUBATION_USER": {
      const incUser = await db.incubationUser.findUnique({
        where: { id: entityId },
        select: { userId: true },
      });
      return incUser?.userId ? [incUser.userId] : [];
    }

    case "USER":
      return [entityId];

    default:
      return [];
  }
}
