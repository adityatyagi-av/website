import { ApiError } from "../utils/ApiError.js";
import db from "../db/db.js";
import { getRedis, setRedis } from "../config/redisClient.js";
import {
  resolveTenantAccess,
  resolveUserPermissions,
  logAccessDenial,
} from "../services/common/access.service.js";
import { CORE_MODULE_KEYS, isValidModuleKey } from "../config/modules.registry.js";

const ENFORCEMENT_ON = (process.env.ACCESS_ENFORCEMENT || "on").toLowerCase() !== "off";

async function getTenantByKey(tenantKey) {
  const cached = await getRedis(tenantKey);
  if (cached) return JSON.parse(cached);
  const tenant = await db.tenant.findUnique({ where: { tenantKey } });
  if (tenant) await setRedis(tenantKey, JSON.stringify(tenant), 86400);
  return tenant;
}

async function deny(req, payload) {
  await logAccessDenial({
    userId: payload.userId,
    tenantId: payload.tenantId,
    moduleKey: payload.moduleKey,
    action: payload.action,
    reason: payload.reason,
    method: req.method,
    path: req.originalUrl,
  });
  if (!ENFORCEMENT_ON) return null;
  const statusByReason = {
    SUBSCRIPTION_INACTIVE: 402,
    MODULE_NOT_IN_SUBSCRIPTION: 403,
    INSUFFICIENT_PERMISSION: 403,
    ROLE_NOT_ASSIGNED: 403,
    INVALID_MODULE_KEY: 400,
  };
  const status = statusByReason[payload.reason] || 403;
  throw new ApiError(status, payload.reason, [
    { moduleKey: payload.moduleKey, action: payload.action },
  ]);
}

export function actionForMethod(method) {
  switch ((method || "").toUpperCase()) {
    case "GET":
    case "HEAD":
      return "R";
    case "POST":
      return "C";
    case "PUT":
    case "PATCH":
      return "U";
    case "DELETE":
      return "D";
    default:
      return "R";
  }
}

/**
 * Convenience: infers the action from HTTP method. Use via
 *   router.use(authenticatePortal, requireAccessByMethod(MODULE_KEYS.TASK));
 */
export function requireAccessByMethod(moduleKey) {
  return (req, res, next) => {
    const action = actionForMethod(req.method);
    return requireAccess({ module: moduleKey, action })(req, res, next);
  };
}

/**
 * Composite gate: checks that the tenant's subscription includes the module
 * AND the user has the required action on that module.
 */
export function requireAccess({ module: moduleKey, action }) {
  if (!moduleKey || !action) {
    throw new Error("requireAccess requires { module, action }");
  }
  if (!isValidModuleKey(moduleKey)) {
    throw new Error(`requireAccess received unknown moduleKey: ${moduleKey}`);
  }

  return async (req, res, next) => {
    try {
      const tenantKey = req.headers["tenantkey"];
      if (!tenantKey) throw new ApiError(401, "HostName Not Found");

      const tenant = await getTenantByKey(tenantKey);
      if (!tenant) throw new ApiError(401, "Organization Not Found");

      const userId = req.user?.incubationUserId || req.user?.id;
      if (!userId) throw new ApiError(401, "Unauthorized");

      const tenantAccess = await resolveTenantAccess(tenant.id);

      const isCore = CORE_MODULE_KEYS.includes(moduleKey);

      if (!tenantAccess.hasActiveSubscription && !isCore) {
        return await deny(req, {
          userId,
          tenantId: tenant.id,
          moduleKey,
          action,
          reason: "SUBSCRIPTION_INACTIVE",
        }) || next();
      }

      if (!tenantAccess.moduleKeys.includes(moduleKey)) {
        return await deny(req, {
          userId,
          tenantId: tenant.id,
          moduleKey,
          action,
          reason: "MODULE_NOT_IN_SUBSCRIPTION",
        }) || next();
      }

      const userAccess = await resolveUserPermissions(tenant.id, userId);

      if (!userAccess.isMember) {
        return await deny(req, {
          userId,
          tenantId: tenant.id,
          moduleKey,
          action,
          reason: "ROLE_NOT_ASSIGNED",
        }) || next();
      }

      if (userAccess.isAdmin) {
        req.access = { tenantId: tenant.id, moduleKey, action, isAdmin: true };
        return next();
      }

      const actions = userAccess.permissions[moduleKey] || [];
      if (!actions.includes(action) && !actions.includes("F")) {
        return await deny(req, {
          userId,
          tenantId: tenant.id,
          moduleKey,
          action,
          reason: "INSUFFICIENT_PERMISSION",
        }) || next();
      }

      req.access = { tenantId: tenant.id, moduleKey, action, isAdmin: false };
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
