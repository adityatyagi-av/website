import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import db from "../db/db.js";
import { getRedis, setRedis } from "../config/redisClient.js";

const ACCESS_SECRET = process.env.ACCESS_SECRET;
export async function authenticatePortal(req, res, next) {
  const tenantKey = req.headers["tenantkey"];
  if (!tenantKey) {
    throw new ApiError(400, "HostName Not Found");
  }
  let tenantData;
  const data = await getRedis(tenantKey);
  tenantData = data ? JSON.parse(data) : null;
  if (!tenantData) {
    tenantData = await db.tenant.findUnique({
      where: { tenantKey },
    });
    if (!tenantData) {
      throw new ApiError(404, "Organization Not Found");
    }
    const data = JSON.stringify(tenantData);
    await setRedis(tenantKey, data, 86400);
  }
  const checkIsTenantActive = tenantData.status === "ACTIVE";
  if (!checkIsTenantActive) {
    throw new ApiError(403, "Organization is not Active");
  }
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }
  if (!token && req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }
  if (!token) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);
    req.user = decoded;

    // JWT contains User.id (ecosystem user). Resolve the linked IncubationUser
    // for tenant membership lookup. Fallback handles legacy tokens with IncubationUser.id.
    const rawUserId = decoded.id;
    if (rawUserId) {
      const memberCacheKey = `membership:${tenantData.id}:${rawUserId}`;
      let membership;
      let incubationUserId = rawUserId;
      const cachedMembership = await getRedis(memberCacheKey);
      if (cachedMembership) {
        const cached = JSON.parse(cachedMembership);
        membership = cached?.membership || null;
        incubationUserId = cached?.incubationUserId || rawUserId;
      } else {
        // Primary path: rawUserId is User.id — resolve through IncubationUser.userId
        const incUser = await db.incubationUser.findFirst({
          where: { userId: rawUserId },
          select: { id: true },
        });
        if (incUser) {
          incubationUserId = incUser.id;
          membership = await db.incubationUserTenant.findUnique({
            where: {
              incubationUserId_tenantId: {
                incubationUserId: incUser.id,
                tenantId: tenantData.id,
              },
            },
            select: { id: true, isAdmin: true, isPanelMember: true, isActive: true, roleId: true },
          });
        }

        // Fallback: rawUserId might be IncubationUser.id (legacy tokens)
        if (!membership) {
          membership = await db.incubationUserTenant.findUnique({
            where: {
              incubationUserId_tenantId: {
                incubationUserId: rawUserId,
                tenantId: tenantData.id,
              },
            },
            select: { id: true, isAdmin: true, isPanelMember: true, isActive: true, roleId: true },
          });
          if (membership) {
            incubationUserId = rawUserId;
          }
        }
        await setRedis(memberCacheKey, JSON.stringify({ membership: membership || null, incubationUserId }), 300);
      }

      req.user.tenantId = tenantData.id;
      req.user.incubationUserId = incubationUserId;
      req.user.isMember = !!(membership && membership.isActive);
      req.user.isAdmin = !!(membership && membership.isAdmin);
      req.user.isPanelMember = !!(membership && membership.isPanelMember);
      req.user.membershipId = membership?.id || null;
      req.user.roleId = membership?.roleId || null;
    }

    next();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, "Invalid or expired token");
  }
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw new ApiError(403, "Forbidden: insufficient permissions");
    }
    next();
  };
}
