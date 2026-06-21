import db from "../db/db.js";
import { ApiError } from "./ApiError.js";
import { getRedis, setRedis } from "../config/redisClient.js";

export async function resolveTenantId(req) {
  const tenantKey = req.headers["tenantkey"] || req.body?.tenantKey;
  if (!tenantKey) {
    throw new ApiError(401, "tenantKey is required in headers or body");
  }

  let tenantData;
  const cached = await getRedis(tenantKey);
  if (cached) {
    tenantData = JSON.parse(cached);
  }

  if (!tenantData) {
    tenantData = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenantData) {
      throw new ApiError(404, "Tenant not found");
    }
    await setRedis(tenantKey, JSON.stringify(tenantData), 86400);
  }

  return tenantData.id;
}

export async function resolveUserTenantMembership(incubationUserId, tenantId) {
  const membership = await db.incubationUserTenant.findUnique({
    where: {
      incubationUserId_tenantId: { incubationUserId, tenantId },
    },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: { include: { module: true } },
            },
          },
        },
      },
    },
  });

  if (!membership || !membership.isActive) {
    throw new ApiError(403, "You are not a member of this organization");
  }

  return membership;
}
