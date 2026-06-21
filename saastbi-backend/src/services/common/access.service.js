import db from "../../db/db.js";
import { CORE_MODULE_KEYS } from "../../config/modules.registry.js";
import {
  getCachedTenantModules,
  setCachedTenantModules,
  getCachedUserPerms,
  setCachedUserPerms,
} from "../../utils/accessCache.js";

const ACTIVE_STATUS = "ACTIVE";

function isWithinWindow(override, now = new Date()) {
  if (override.startsAt && now < new Date(override.startsAt)) return false;
  if (override.expiresAt && now > new Date(override.expiresAt)) return false;
  return true;
}

export async function resolveTenantAccess(tenantId) {
  const cached = await getCachedTenantModules(tenantId);
  if (cached) return cached;

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      status: true,
      planId: true,
    },
  });
  if (!tenant) {
    return { tenantId, hasActiveSubscription: false, moduleKeys: [], reason: "TENANT_NOT_FOUND" };
  }

  // TODO: After running `prisma db push`, change back to:
  //   status: { in: [ACTIVE_STATUS, "CHANGE_PENDING"] }
  // to enable graceful plan changes (old sub stays active during plan switch).
  const activeSubscription = await db.subscription.findFirst({
    where: { tenantId, status: ACTIVE_STATUS },
    orderBy: { createdAt: "desc" },
    select: { id: true, planId: true, startDate: true, endDate: true, status: true },
  });

  const planModuleKeys = new Set(CORE_MODULE_KEYS);

  if (activeSubscription?.planId) {
    const planModules = await db.planModule.findMany({
      where: { planId: activeSubscription.planId },
      select: { module: { select: { moduleKey: true, isActive: true } } },
    });
    for (const pm of planModules) {
      if (pm.module?.isActive) planModuleKeys.add(pm.module.moduleKey);
    }
  }

  const overrides = await db.tenantModuleOverride.findMany({
    where: { tenantId, isActive: true },
    select: {
      grantType: true,
      startsAt: true,
      expiresAt: true,
      module: { select: { moduleKey: true, isActive: true } },
    },
  });

  for (const o of overrides) {
    if (!o.module?.isActive) continue;
    if (!isWithinWindow(o)) continue;
    if (o.grantType === "INCLUDE") planModuleKeys.add(o.module.moduleKey);
    if (o.grantType === "EXCLUDE") planModuleKeys.delete(o.module.moduleKey);
  }

  // core modules are always granted, even if subscription is missing/expired
  for (const k of CORE_MODULE_KEYS) planModuleKeys.add(k);

  const result = {
    tenantId,
    hasActiveSubscription: !!activeSubscription,
    subscriptionId: activeSubscription?.id || null,
    planId: activeSubscription?.planId || tenant.planId || null,
    moduleKeys: [...planModuleKeys],
  };

  await setCachedTenantModules(tenantId, result);
  return result;
}

export async function resolveUserPermissions(tenantId, incubationUserId) {
  const cached = await getCachedUserPerms(tenantId, incubationUserId);
  if (cached) return cached;

  const membership = await db.incubationUserTenant.findUnique({
    where: {
      incubationUserId_tenantId: {
        incubationUserId,
        tenantId,
      },
    },
    select: {
      id: true,
      isAdmin: true,
      isActive: true,
      roleId: true,
    },
  });

  if (!membership || !membership.isActive) {
    const result = { tenantId, userId: incubationUserId, isMember: false, isAdmin: false, permissions: {} };
    await setCachedUserPerms(tenantId, incubationUserId, result);
    return result;
  }

  const permissions = {};

  const addPerm = (moduleKey, action) => {
    if (!permissions[moduleKey]) permissions[moduleKey] = new Set();
    permissions[moduleKey].add(action);
  };

  if (membership.roleId) {
    const rolePerms = await db.rolePermission.findMany({
      where: { roleId: membership.roleId, isActive: true },
      select: {
        permission: {
          select: {
            action: true,
            module: { select: { moduleKey: true, isActive: true } },
          },
        },
      },
    });
    for (const rp of rolePerms) {
      const mod = rp.permission?.module;
      if (!mod?.isActive) continue;
      addPerm(mod.moduleKey, rp.permission.action);
    }
  }

  const userPerms = await db.userPermission.findMany({
    where: { userId: incubationUserId },
    select: {
      permission: {
        select: {
          action: true,
          module: { select: { moduleKey: true, isActive: true } },
        },
      },
    },
  });
  for (const up of userPerms) {
    const mod = up.permission?.module;
    if (!mod?.isActive) continue;
    addPerm(mod.moduleKey, up.permission.action);
  }

  const asObject = {};
  for (const [k, v] of Object.entries(permissions)) asObject[k] = [...v];

  const result = {
    tenantId,
    userId: incubationUserId,
    isMember: true,
    isAdmin: membership.isAdmin,
    permissions: asObject,
  };
  await setCachedUserPerms(tenantId, incubationUserId, result);
  return result;
}

export async function logAccessDenial({ userId, tenantId, moduleKey, action, reason, method, path }) {
  try {
    await db.accessAuditLog.create({
      data: { userId, tenantId, moduleKey, action, reason, method, path },
    });
  } catch (err) {
    console.error("[access] failed to log denial:", err.message);
  }
}
