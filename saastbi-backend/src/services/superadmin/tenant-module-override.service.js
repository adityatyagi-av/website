import db from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";
import { invalidateTenantModules } from "../../utils/accessCache.js";

export const TenantModuleOverrideService = {
  create: async ({ tenantId, moduleId, grantType = "INCLUDE", reason, grantedBy, startsAt, expiresAt }) => {
    const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const mod = await db.module.findUnique({ where: { id: moduleId }, select: { id: true, isCore: true } });
    if (!mod) throw new ApiError(404, "Module not found");
    if (mod.isCore && grantType === "EXCLUDE") {
      throw new ApiError(400, "Core modules cannot be excluded");
    }

    const override = await db.tenantModuleOverride.upsert({
      where: { tenantId_moduleId: { tenantId, moduleId } },
      update: {
        grantType,
        reason,
        grantedBy,
        startsAt: startsAt ? new Date(startsAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
      },
      create: {
        tenantId,
        moduleId,
        grantType,
        reason,
        grantedBy,
        startsAt: startsAt ? new Date(startsAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
      },
    });

    await invalidateTenantModules(tenantId);
    return override;
  },

  list: async ({ tenantId }) => {
    return db.tenantModuleOverride.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        module: { select: { id: true, moduleKey: true, moduleName: true, isCore: true } },
      },
    });
  },

  update: async ({ tenantId, overrideId, data }) => {
    const existing = await db.tenantModuleOverride.findFirst({
      where: { id: overrideId, tenantId },
      include: { module: { select: { isCore: true, moduleKey: true } } },
    });
    if (!existing) throw new ApiError(404, "Override not found");

    const nextGrantType = data.grantType ?? existing.grantType;
    if (existing.module.isCore && nextGrantType === "EXCLUDE") {
      throw new ApiError(
        400,
        `Core modules cannot be excluded: ${existing.module.moduleKey}`
      );
    }

    const updated = await db.tenantModuleOverride.update({
      where: { id: overrideId },
      data: {
        grantType: nextGrantType,
        reason: data.reason ?? existing.reason,
        startsAt: data.startsAt !== undefined ? (data.startsAt ? new Date(data.startsAt) : null) : existing.startsAt,
        expiresAt: data.expiresAt !== undefined ? (data.expiresAt ? new Date(data.expiresAt) : null) : existing.expiresAt,
        isActive: data.isActive ?? existing.isActive,
      },
    });

    await invalidateTenantModules(tenantId);
    return updated;
  },

  remove: async ({ tenantId, overrideId }) => {
    const existing = await db.tenantModuleOverride.findFirst({
      where: { id: overrideId, tenantId },
    });
    if (!existing) throw new ApiError(404, "Override not found");

    await db.tenantModuleOverride.delete({ where: { id: overrideId } });
    await invalidateTenantModules(tenantId);
    return { deleted: true };
  },
};
