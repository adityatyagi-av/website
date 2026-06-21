import db from "../../db/db.js";
import { ApiError } from "../ApiError.js";

/**
 * Resolve entity access for conversation queries.
 * Returns { participantId, participantType } used to scope inbox queries.
 */
export async function resolveEntityAccess(userId, entityId, entityType) {
  if (!entityId || !entityType || entityType === "USER") {
    return { participantId: userId, participantType: "USER" };
  }

  if (entityType === "STARTUP") {
    const membership = await db.startupMember.findUnique({
      where: { startupId_userId: { startupId: entityId, userId } },
    });
    if (!membership || !membership.isActive) {
      throw new ApiError(403, "You are not a member of this startup");
    }
    return { participantId: entityId, participantType: "STARTUP" };
  }

  if (entityType === "PAGE") {
    const pageMember = await db.pageMember.findUnique({
      where: { pageId_userId: { pageId: entityId, userId } },
    });
    if (!pageMember) {
      throw new ApiError(403, "You are not a member of this page");
    }
    return { participantId: entityId, participantType: "PAGE" };
  }

  if (entityType === "TENANT") {
    const incUser = await db.incubationUser.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
    });
    if (!incUser) {
      throw new ApiError(403, "No incubation user found");
    }
    const membership = await db.incubationUserTenant.findUnique({
      where: {
        incubationUserId_tenantId: {
          incubationUserId: incUser.id,
          tenantId: entityId,
        },
      },
    });
    if (!membership || !membership.isActive) {
      throw new ApiError(403, "You are not a member of this tenant");
    }
    return { participantId: entityId, participantType: "TENANT" };
  }

  if (entityType === "INCUBATION_USER") {
    const incUser = await db.incubationUser.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
    });
    if (!incUser) {
      throw new ApiError(403, "No incubation user found");
    }
    return { participantId: incUser.id, participantType: "INCUBATION_USER" };
  }

  return { participantId: userId, participantType: "USER" };
}

/**
 * Get all entity IDs a user controls (for personal inbox exclusion).
 * Returns array of { id, type } for all entities the user belongs to.
 */
export async function getUserOwnedEntityIds(userId) {
  const [startupMemberships, pageMemberships, tenantMemberships, incubationUsers] = await Promise.all([
    db.startupMember.findMany({
      where: { userId, isActive: true },
      select: { startupId: true },
    }),
    db.pageMember.findMany({
      where: { userId },
      select: { pageId: true },
    }),
    db.incubationUserTenant.findMany({
      where: { incubationUser: { userId }, isActive: true },
      select: { tenantId: true, incubationUserId: true },
    }),
    db.incubationUser.findMany({
      where: { userId, isActive: true },
      select: { id: true },
    }),
  ]);

  const entities = [];
  startupMemberships.forEach((m) => entities.push({ id: m.startupId, type: "STARTUP" }));
  pageMemberships.forEach((m) => entities.push({ id: m.pageId, type: "PAGE" }));
  tenantMemberships.forEach((m) => {
    entities.push({ id: m.tenantId, type: "TENANT" });
    entities.push({ id: m.incubationUserId, type: "INCUBATION_USER" });
  });
  incubationUsers.forEach((m) => {
    if (!entities.some((e) => e.id === m.id && e.type === "INCUBATION_USER")) {
      entities.push({ id: m.id, type: "INCUBATION_USER" });
    }
  });

  return entities;
}

/**
 * Resolve all entity IDs a startup controls (itself + its page).
 */
export async function resolveStartupEntityIds(startupId) {
  const startup = await db.startup.findUnique({
    where: { id: startupId },
    select: { pageId: true },
  });
  const entities = [{ id: startupId, type: "STARTUP" }];
  if (startup?.pageId) {
    entities.push({ id: startup.pageId, type: "PAGE" });
  }
  return entities;
}

/**
 * Build a WHERE clause for conversation queries scoped to an inbox.
 *
 * For PERSONAL inbox (participantType=USER):
 *   Shows only conversations where the user is directly a participant.
 *   Excludes conversations where the user's entities are participants
 *   (those belong in entity-specific inboxes).
 *
 * For ENTITY inbox (STARTUP/PAGE/TENANT/INCUBATION_USER):
 *   Shows only conversations where that entity is a participant.
 *   For STARTUP, also includes conversations where the startup's PAGE is participant.
 */
export function buildInboxWhere(participantId, participantType, additionalFilters = {}, relatedEntities = null, excludeEntityIds = null) {
  const orConditions = [
    { participant1Id: participantId, participant1Type: participantType },
    { participant2Id: participantId, participant2Type: participantType },
  ];

  if (relatedEntities) {
    relatedEntities.forEach((entity) => {
      if (entity.id !== participantId || entity.type !== participantType) {
        orConditions.push({ participant1Id: entity.id, participant1Type: entity.type });
        orConditions.push({ participant2Id: entity.id, participant2Type: entity.type });
      }
    });
  }

  const where = {
    OR: orConditions,
    isActive: true,
    ...additionalFilters,
  };

  // For personal inbox, exclude conversations where the user's entities are participants
  if (participantType === "USER" && excludeEntityIds && excludeEntityIds.length > 0) {
    const excludeConditions = [];
    for (const entity of excludeEntityIds) {
      excludeConditions.push(
        { participant1Id: entity.id, participant1Type: entity.type },
        { participant2Id: entity.id, participant2Type: entity.type },
      );
    }
    where.NOT = { OR: excludeConditions };
  }

  return where;
}
