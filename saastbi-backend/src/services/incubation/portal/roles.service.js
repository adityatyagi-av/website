import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";
import { resolveTenantAccess } from "../../common/access.service.js";
import { invalidateTenantModules, invalidateUsersOfRole } from "../../../utils/accessCache.js";

async function assertModulesInAccess(tenantId, modulePermissions) {
  if (!Array.isArray(modulePermissions) || modulePermissions.length === 0) return;
  const access = await resolveTenantAccess(tenantId);
  const available = new Set(access.moduleKeys);
  const moduleIds = modulePermissions.map((m) => m.moduleId);
  const modules = await db.module.findMany({
    where: { id: { in: moduleIds } },
    select: { id: true, moduleKey: true },
  });
  const byId = new Map(modules.map((m) => [m.id, m.moduleKey]));
  for (const mp of modulePermissions) {
    const key = byId.get(mp.moduleId);
    if (!key) throw new ApiError(400, `Unknown module: ${mp.moduleId}`);
    if (!available.has(key)) {
      throw new ApiError(403, `Module not in tenant subscription: ${key}`);
    }
  }
}

async function invalidateRoleUsers(tenantId, roleId) {
  await invalidateTenantModules(tenantId);
  if (roleId) await invalidateUsersOfRole(tenantId, roleId);
}

export const roleService = {
  createRole: async ({ tenantKey, roleName, modulePermissions }) => {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    await assertModulesInAccess(tenant.id, modulePermissions);

    const role = await db.role.create({
      data: {
        roleName,
        tenant: { connect: { id: tenant.id } },
      },
    });

    const permissionIds = [];
    for (const mod of modulePermissions || []) {
      const perms = await db.permission.findMany({
        where: { moduleId: mod.moduleId, action: { in: mod.actions } },
      });
      permissionIds.push(...perms.map((p) => p.id));
    }

    if (permissionIds.length > 0) {
      await db.rolePermission.createMany({
        data: permissionIds.map((pid) => ({ roleId: role.id, permissionId: pid })),
      });
    }

    await invalidateRoleUsers(tenant.id, role.id);
    return { ...role, permissionsAssigned: permissionIds.length };
  },

  updateRole: async ({ tenantKey, roleId, roleName, modulePermissions }) => {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const role = await db.role.findFirst({ where: { id: roleId, tenantId: tenant.id } });
    if (!role) throw new ApiError(404, "Role not found");

    if (modulePermissions) await assertModulesInAccess(tenant.id, modulePermissions);

    if (roleName && roleName !== role.roleName) {
      await db.role.update({ where: { id: roleId }, data: { roleName } });
    }

    if (Array.isArray(modulePermissions)) {
      await db.rolePermission.deleteMany({ where: { roleId } });
      const permissionIds = [];
      for (const mod of modulePermissions) {
        const perms = await db.permission.findMany({
          where: { moduleId: mod.moduleId, action: { in: mod.actions } },
        });
        permissionIds.push(...perms.map((p) => p.id));
      }
      if (permissionIds.length > 0) {
        await db.rolePermission.createMany({
          data: permissionIds.map((pid) => ({ roleId, permissionId: pid })),
        });
      }
    }

    await invalidateRoleUsers(tenant.id, roleId);
    return { id: roleId, updated: true };
  },

  getRoles: async ({ tenantKey, page, limit, search, sortBy, order }) => {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");
    const queryOptions = buildQueryOptions({
      page, limit, search,
      searchFields: ["roleName"],
      defaultFields: ["roleName"],
      sortBy, order,
    });

    const [roles, total] = await Promise.all([
      db.role.findMany({
        where: { tenantId: tenant.id, ...queryOptions.where },
        skip: queryOptions.skip,
        take: queryOptions.take,
        orderBy: queryOptions.orderBy,
        include: {
          permissions: {
            include: {
              permission: {
                select: { id: true, action: true, moduleId: true },
              },
            },
          },
        },
      }),
      db.role.count({ where: { tenantId: tenant.id, ...queryOptions.where } }),
    ]);

    return {
      data: roles,
      pagination: {
        total,
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        totalPages: Math.ceil(total / (Number(limit) || 10)),
      },
    };
  },

  getRolesDropdown: async ({ tenantKey }) => {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    return db.role.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, roleName: true },
      orderBy: { roleName: "asc" },
    });
  },

  getAvailableModules: async ({ tenantKey }) => {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const access = await resolveTenantAccess(tenant.id);
    if (access.moduleKeys.length === 0) return [];

    const modules = await db.module.findMany({
      where: { moduleKey: { in: access.moduleKeys }, isActive: true },
      orderBy: [{ displayOrder: "asc" }, { moduleName: "asc" }],
      include: {
        permissions: { select: { id: true, action: true } },
      },
    });

    return modules.map((m) => ({
      id: m.id,
      moduleKey: m.moduleKey,
      moduleName: m.moduleName,
      moduleDescription: m.moduleDescription,
      category: m.category,
      isCore: m.isCore,
      permissions: m.permissions,
    }));
  },
};
