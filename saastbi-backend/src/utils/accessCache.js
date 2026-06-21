import { getRedis, setRedis, deleteRedis, invalidateTenantCache } from "../config/redisClient.js";

const MODULES_TTL = 300;
const PERMS_TTL = 300;

const keys = {
  tenantModules: (tenantId) => `access:tenant:${tenantId}:modules`,
  userPerms: (tenantId, userId) => `access:tenant:${tenantId}:user:${userId}:perms`,
  tenantUserList: (tenantId) => `access:tenant:${tenantId}:users`,
};

export async function getCachedTenantModules(tenantId) {
  const raw = await getRedis(keys.tenantModules(tenantId));
  return raw ? JSON.parse(raw) : null;
}

export async function setCachedTenantModules(tenantId, value) {
  await setRedis(keys.tenantModules(tenantId), JSON.stringify(value), MODULES_TTL);
}

export async function invalidateTenantModules(tenantId) {
  if (!tenantId) return;
  await deleteRedis(keys.tenantModules(tenantId));
}

export async function getCachedUserPerms(tenantId, userId) {
  const raw = await getRedis(keys.userPerms(tenantId, userId));
  return raw ? JSON.parse(raw) : null;
}

export async function setCachedUserPerms(tenantId, userId, value) {
  await setRedis(keys.userPerms(tenantId, userId), JSON.stringify(value), PERMS_TTL);
}

export async function invalidateUserPerms(tenantId, userId) {
  if (!tenantId || !userId) return;
  await deleteRedis(keys.userPerms(tenantId, userId));
}

export async function invalidateTenantAccess(tenantId) {
  if (!tenantId) return;
  await deleteRedis(keys.tenantModules(tenantId));
}

/**
 * Clears BOTH the access module cache (used by requireAccess middleware)
 * and the tenant data cache (used by authenticatePortal middleware).
 * Call this after any operation that changes a tenant's subscription,
 * plan, or module access.
 */
export async function invalidateAllTenantCaches(tenantId) {
  if (!tenantId) return;
  await Promise.all([
    invalidateTenantModules(tenantId),
    invalidateTenantCache(tenantId),
  ]);
}

export async function invalidateAllForPlan(planId) {
  const { default: db } = await import("../db/db.js");
  // Query active subscriptions for this plan, not Tenant.planId (which can be stale)
  const subscriptions = await db.subscription.findMany({
    where: { planId, status: "ACTIVE" },
    select: { tenantId: true },
  });
  const uniqueTenantIds = [...new Set(subscriptions.map((s) => s.tenantId))];
  await Promise.all(uniqueTenantIds.map((id) => invalidateTenantModules(id)));
}

export async function invalidateUsersOfRole(tenantId, roleId) {
  const { default: db } = await import("../db/db.js");
  const memberships = await db.incubationUserTenant.findMany({
    where: { tenantId, roleId },
    select: { incubationUserId: true },
  });
  await Promise.all(memberships.map((m) => invalidateUserPerms(tenantId, m.incubationUserId)));
}
