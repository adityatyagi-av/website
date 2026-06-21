import db from "../../db/db.js";
import { resolveTenantAccess, resolveUserPermissions } from "../../services/common/access.service.js";

const registry = new Map();

function registerEntityType(type, handler) {
  registry.set(type, handler);
}

function getHandler(type) {
  return registry.get(type);
}

function getRegisteredTypes() {
  return [...registry.keys()];
}

// --- USER ---
registerEntityType("USER", {
  async resolve(entityId) {
    const user = await db.user.findUnique({
      where: { id: entityId },
      select: { id: true, firstName: true, lastName: true, profilePhoto: true, email: true },
    });
    return user
      ? { id: user.id, name: `${user.firstName || ""} ${user.lastName || ""}`.trim(), avatar: user.profilePhoto, email: user.email, type: "USER" }
      : { id: entityId, name: "Deleted User", avatar: null, type: "USER" };
  },
  async canSend(userId) {
    return { allowed: true };
  },
  async getMembers(entityId) {
    return [entityId];
  },
  async getOwnerEntity(entityId) {
    return null;
  },
});

// --- STARTUP ---
registerEntityType("STARTUP", {
  async resolve(entityId) {
    const startup = await db.startup.findUnique({
      where: { id: entityId },
      select: {
        id: true, name: true, logoUrl: true, contactEmail: true, pageId: true,
        page: { select: { id: true, name: true, logo: true } },
      },
    });
    if (startup) {
      return {
        id: startup.id,
        name: startup.page?.name || startup.name,
        avatar: startup.page?.logo || startup.logoUrl,
        email: startup.contactEmail,
        type: "STARTUP",
        linkedPageId: startup.pageId,
      };
    }
    return { id: entityId, name: "Deleted Startup", avatar: null, type: "STARTUP" };
  },
  async canSend(userId, entityId) {
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
  },
  async getMembers(entityId) {
    const members = await db.startupMember.findMany({
      where: { startupId: entityId, isActive: true },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  },
  async getOwnerEntity(entityId) {
    return null;
  },
});

// --- PAGE ---
registerEntityType("PAGE", {
  async resolve(entityId) {
    const page = await db.page.findUnique({
      where: { id: entityId },
      select: { id: true, name: true, logo: true, type: true, email: true },
    });
    return page
      ? { id: page.id, name: page.name, avatar: page.logo, email: page.email, pageType: page.type, type: "PAGE" }
      : { id: entityId, name: "Deleted Page", avatar: null, type: "PAGE" };
  },
  async canSend(userId, entityId) {
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
  },
  async getMembers(entityId) {
    const members = await db.pageMember.findMany({
      where: { pageId: entityId },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  },
  async getOwnerEntity(entityId) {
    const startup = await db.startup.findFirst({
      where: { pageId: entityId },
      select: { id: true },
    });
    if (startup) return { id: startup.id, type: "STARTUP" };
    const tenant = await db.tenant.findFirst({
      where: { pageId: entityId },
      select: { id: true },
    });
    if (tenant) return { id: tenant.id, type: "TENANT" };
    return null;
  },
});

// --- TENANT ---
registerEntityType("TENANT", {
  async resolve(entityId) {
    const tenant = await db.tenant.findFirst({
      where: { OR: [{ id: entityId }, { tenantKey: entityId }] },
      select: {
        id: true, organizationName: true, tenantLogo: true, pageId: true,
        page: { select: { id: true, name: true, logo: true } },
      },
    });
    if (tenant) {
      return {
        id: tenant.id,
        name: tenant.page?.name || tenant.organizationName,
        avatar: tenant.page?.logo || tenant.tenantLogo,
        type: "TENANT",
        linkedPageId: tenant.pageId,
      };
    }
    return { id: entityId, name: "Deleted Tenant", avatar: null, type: "TENANT" };
  },
  async canSend(userId, entityId) {
    const incUser = await db.incubationUser.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
    });
    if (!incUser) {
      return { allowed: false, reason: "No incubation user found" };
    }
    const membership = await db.incubationUserTenant.findUnique({
      where: { incubationUserId_tenantId: { incubationUserId: incUser.id, tenantId: entityId } },
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
  },
  async getMembers(entityId) {
    const members = await db.incubationUserTenant.findMany({
      where: { tenantId: entityId, isActive: true },
      include: { incubationUser: { select: { userId: true } } },
    });
    return members.map((m) => m.incubationUser?.userId).filter(Boolean);
  },
  async getOwnerEntity(entityId) {
    return null;
  },
});

// --- INCUBATION_USER ---
registerEntityType("INCUBATION_USER", {
  async resolve(entityId) {
    const incUser = await db.incubationUser.findUnique({
      where: { id: entityId },
      select: { id: true, name: true, email: true, imageUrl: true, userId: true },
    });
    if (incUser) {
      let avatar = incUser.imageUrl;
      if (!avatar && incUser.userId) {
        const user = await db.user.findUnique({
          where: { id: incUser.userId },
          select: { profilePhoto: true },
        });
        avatar = user?.profilePhoto || null;
      }
      return { id: incUser.id, name: incUser.name, avatar, email: incUser.email, type: "INCUBATION_USER" };
    }
    return { id: entityId, name: "Deleted User", avatar: null, type: "INCUBATION_USER" };
  },
  async canSend(userId, entityId) {
    const incUser = await db.incubationUser.findFirst({
      where: { id: entityId, userId, isActive: true },
      select: { id: true },
    });
    if (!incUser) {
      return { allowed: false, reason: "Not authorized as this incubation user" };
    }
    return { allowed: true };
  },
  async getMembers(entityId) {
    const incUser = await db.incubationUser.findUnique({
      where: { id: entityId },
      select: { userId: true },
    });
    return incUser?.userId ? [incUser.userId] : [];
  },
  async getOwnerEntity(entityId) {
    return null;
  },
});

export { registerEntityType, getHandler, getRegisteredTypes };
