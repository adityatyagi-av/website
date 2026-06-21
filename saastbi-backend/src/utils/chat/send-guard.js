import db from "../../db/db.js";
import { ApiError } from "../ApiError.js";
import { resolveTenantAccess, resolveUserPermissions } from "../../services/common/access.service.js";

/**
 * Validates whether a user can send messages on behalf of an entity.
 *
 * - STARTUP: only OWNER or ADMIN role in StartupMember
 * - PAGE: only OWNER or ADMIN role in PageMember
 * - TENANT: requires CHAT module with "C" action permission
 * - INCUBATION_USER: must be the linked user
 * - USER: always allowed (self)
 */
export async function validateSendPermission(userId, entityId, entityType) {
  if (!entityType || entityType === "USER") {
    return { allowed: true };
  }

  if (entityType === "STARTUP") {
    const membership = await db.startupMember.findUnique({
      where: { startupId_userId: { startupId: entityId, userId } },
    });
    if (!membership || !membership.isActive) {
      return { allowed: false, reason: "You are not a member of this startup" };
    }
    if (!["OWNER", "ADMIN"].includes(membership.role)) {
      return { allowed: false, reason: "Only startup admins can send messages on behalf of the startup" };
    }
    return { allowed: true };
  }

  if (entityType === "PAGE") {
    const pageMember = await db.pageMember.findUnique({
      where: { pageId_userId: { pageId: entityId, userId } },
    });
    if (!pageMember) {
      return { allowed: false, reason: "You are not a member of this page" };
    }
    if (!["OWNER", "ADMIN"].includes(pageMember.role)) {
      return { allowed: false, reason: "Only page admins can send messages on behalf of the page" };
    }
    return { allowed: true };
  }

  if (entityType === "TENANT") {
    const incUser = await db.incubationUser.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
    });
    if (!incUser) {
      return { allowed: false, reason: "No incubation user found" };
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
      return { allowed: false, reason: "You are not a member of this tenant" };
    }

    const tenantAccess = await resolveTenantAccess(entityId);
    if (!tenantAccess.moduleKeys.includes("CHAT")) {
      return { allowed: false, reason: "Chat module is not enabled for this tenant" };
    }

    if (membership.isAdmin) {
      return { allowed: true };
    }

    const userAccess = await resolveUserPermissions(entityId, incUser.id);
    const chatActions = userAccess.permissions["CHAT"] || [];
    if (!chatActions.includes("C") && !chatActions.includes("F")) {
      return { allowed: false, reason: "You do not have permission to send chat messages" };
    }
    return { allowed: true };
  }

  if (entityType === "INCUBATION_USER") {
    const incUser = await db.incubationUser.findFirst({
      where: { id: entityId, userId, isActive: true },
      select: { id: true },
    });
    if (!incUser) {
      return { allowed: false, reason: "Not authorized as this incubation user" };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: "Unknown entity type" };
}
