import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";
import { ApiError } from "../../../utils/ApiError.js";
import db from "../../../db/db.js";
import {
  resolveTenantAccess,
  resolveUserPermissions,
} from "../../../services/common/access.service.js";
import { CORE_MODULE_KEYS } from "../../../config/modules.registry.js";

export const MeAccessController = {
  getAccess: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(401, "HostName Not Found");

    const tenant = await db.tenant.findUnique({
      where: { tenantKey },
      select: { id: true, organizationName: true, status: true, planId: true },
    });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const userId = req.user.incubationUserId;
    if (!userId) throw new ApiError(401, "Unauthorized");

    const [tenantAccess, userAccess, allModules] = await Promise.all([
      resolveTenantAccess(tenant.id),
      resolveUserPermissions(tenant.id, userId),
      db.module.findMany({
        where: { isActive: true },
        select: {
          id: true,
          moduleKey: true,
          moduleName: true,
          moduleDescription: true,
          category: true,
          displayOrder: true,
          isCore: true,
        },
        orderBy: [{ category: "asc" }, { displayOrder: "asc" }],
      }),
    ]);
    console.log("THIS IS USER ACCESS",userAccess)
    if (!userAccess.isMember) {
      throw new ApiError(
        403,
        "Your access to this organization has been deactivated",
        "USER_DEACTIVATED_FOR_TENANT",
      );
    }
    const plan = tenantAccess.planId
      ? await db.plan.findUnique({
          where: { id: tenantAccess.planId },
          select: { id: true, name: true, type: true },
        })
      : null;

    const subscribedSet = new Set(tenantAccess.moduleKeys);

    // Build detailed module list with subscription + permission info
    const moduleDetails = allModules.map((mod) => {
      const isSubscribed = subscribedSet.has(mod.moduleKey);
      const userActions =
        userAccess.isAdmin && isSubscribed
          ? ["C", "R", "U", "D", "F"]
          : userAccess.permissions[mod.moduleKey] || [];

      return {
        moduleKey: mod.moduleKey,
        moduleName: mod.moduleName,
        moduleDescription: mod.moduleDescription,
        category: mod.category,
        isCore: mod.isCore,
        isSubscribed,
        hasAccess:
          isSubscribed && (userAccess.isAdmin || userActions.length > 0),
        userActions,
      };
    });

    const nonCoreModules = allModules.filter((m) => !m.isCore);
    const subscribedNonCore = nonCoreModules.filter((m) =>
      subscribedSet.has(m.moduleKey),
    );

    const summary = {
      totalPlatformModules: nonCoreModules.length,
      subscribedModules: subscribedNonCore.length,
      coreModules: CORE_MODULE_KEYS.length,
      unsubscribedModules: nonCoreModules.length - subscribedNonCore.length,
    };

    return apiResponse.sendSuccess(
      res,
      {
        tenant: {
          id: tenant.id,
          organizationName: tenant.organizationName,
          status: tenant.status,
        },
        subscription: {
          hasActive: tenantAccess.hasActiveSubscription,
          subscriptionId: tenantAccess.subscriptionId,
          plan,
        },
        modules: tenantAccess.moduleKeys,
        moduleDetails,
        summary,
        permissions: userAccess.permissions,
        isMember: userAccess.isMember,
        isAdmin: userAccess.isAdmin,
      },
      "Access resolved",
    );
  }),
};
