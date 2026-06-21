import { ApiError } from "../../utils/ApiError.js";
import db from "../../db/db.js";
import { buildQueryOptions } from "../../utils/queryHelper.js";
import { RazorpayService } from "../common/razorpay.service.js";
import { invalidateAllForPlan } from "../../utils/accessCache.js";

const MODULE_PLAN_SELECT = {
  id: true,
  moduleKey: true,
  moduleName: true,
  moduleDescription: true,
  category: true,
  displayOrder: true,
  isCore: true,
  isActive: true,
};

async function assertModuleIdsAttachable(moduleIds = []) {
  if (!Array.isArray(moduleIds) || moduleIds.length === 0) return;

  const unique = [...new Set(moduleIds)];
  const modules = await db.module.findMany({
    where: { id: { in: unique } },
    select: { id: true, moduleKey: true, isCore: true, isActive: true },
  });

  const foundIds = new Set(modules.map((m) => m.id));
  const missing = unique.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    throw new ApiError(
      400,
      `Unknown moduleId(s): ${missing.join(", ")}. The frontend may be holding stale module IDs - refetch GET /api/super-admin/modules/for-plan and resubmit with current IDs.`
    );
  }

  const coreKeys = modules.filter((m) => m.isCore).map((m) => m.moduleKey);
  if (coreKeys.length > 0) {
    throw new ApiError(
      400,
      `Core modules cannot be attached to a plan: ${coreKeys.join(", ")}`
    );
  }

  const inactiveKeys = modules
    .filter((m) => !m.isActive)
    .map((m) => m.moduleKey);
  if (inactiveKeys.length > 0) {
    throw new ApiError(
      400,
      `Inactive modules cannot be attached to a plan: ${inactiveKeys.join(", ")}`
    );
  }
}

export const SuperAdminModuleServices = {
  getModules: async ({
    page,
    limit,
    search,
    searchFields,
    isCore,
    isActive,
    category,
  }) => {
    const { skip, take, where } = buildQueryOptions({
      page,
      limit,
      search,
      searchFields,
      defaultFields: ["moduleName", "moduleKey", "moduleDescription"],
    });

    if (typeof isCore === "boolean") where.isCore = isCore;
    if (typeof isActive === "boolean") where.isActive = isActive;
    if (typeof category === "string" && category.length > 0) {
      where.category = category;
    }

    const [modules, totalCount, activeCount, inactiveCount] = await Promise.all(
      [
        db.module.findMany({
          where,
          skip,
          take,
          orderBy: [
            { category: "asc" },
            { displayOrder: "asc" },
            { moduleName: "asc" },
          ],
          include: { permissions: true },
        }),
        db.module.count({ where }),
        db.module.count({ where: { ...where, isActive: true } }),
        db.module.count({ where: { ...where, isActive: false } }),
      ]
    );

    const totalPages = Math.ceil(totalCount / take);

    return {
      data: modules,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages,
        totalCount,
      },
      stats: {
        totalCount,
        activeCount,
        inactiveCount,
      },
    };
  },

  getModuleDropdown: async ({ excludeCore = false } = {}) => {
    const where = { isActive: true };
    if (excludeCore) where.isCore = false;

    return db.module.findMany({
      where,
      select: {
        id: true,
        moduleKey: true,
        moduleName: true,
        category: true,
        isCore: true,
      },
      orderBy: [
        { category: "asc" },
        { displayOrder: "asc" },
        { moduleName: "asc" },
      ],
    });
  },

  getModulesForPlan: async () => {
    const modules = await db.module.findMany({
      where: { isActive: true, isCore: false },
      select: MODULE_PLAN_SELECT,
      orderBy: [
        { category: "asc" },
        { displayOrder: "asc" },
        { moduleName: "asc" },
      ],
    });

    const groupsMap = new Map();
    for (const m of modules) {
      const cat = m.category || "Other";
      if (!groupsMap.has(cat)) groupsMap.set(cat, []);
      groupsMap.get(cat).push(m);
    }

    const groups = [...groupsMap.entries()].map(([category, mods]) => ({
      category,
      modules: mods,
    }));

    const coreModules = await db.module.findMany({
      where: { isActive: true, isCore: true },
      select: MODULE_PLAN_SELECT,
      orderBy: [{ displayOrder: "asc" }, { moduleName: "asc" }],
    });

    return {
      groups,
      flat: modules,
      coreModules,
    };
  },

  createPlan: async ({
    name,
    price,
    type,
    moduleIds = [],
    maxUsers,
    maxStartups,
    storageLimit,
    features = [],
  }) => {
    if (!name || !price) throw new ApiError(400, "Name and price are required");

    await assertModuleIdsAttachable(moduleIds);

    const intervalMap = {
      MONTHLY: "monthly",
      YEARLY: "yearly",
      WEEKLY: "weekly",
    };

    const interval = intervalMap[type?.toUpperCase()] || "monthly";
    const razorpayPlan = await RazorpayService.createPlan({
      planName: name,
      amount: price,
      interval,
    });
    const plan = await db.plan.create({
      data: {
        name,
        price,
        type,
        maxUsers: maxUsers || 5,
        maxStartups: maxStartups || 1,
        storageLimit: storageLimit || 1024,
        features,
        razorpayPlanId: razorpayPlan.id,
        planModules: {
          create: [...new Set(moduleIds)].map((moduleId) => ({ moduleId })),
        },
      },
      include: {
        planModules: { include: { module: { select: MODULE_PLAN_SELECT } } },
      },
    });
    return plan;
  },

  getPlans: async () => {
    return db.plan.findMany({
      include: {
        planModules: {
          include: { module: { select: MODULE_PLAN_SELECT } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  getPlansByType: async () => {
    const plans = await db.plan.findMany({
      include: {
        planModules: {
          include: { module: { select: MODULE_PLAN_SELECT } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const monthlyPlans = plans.filter((plan) => plan.type === "MONTHLY");
    const yearlyPlans = plans.filter((plan) => plan.type === "YEARLY");
    return { monthlyPlans, yearlyPlans };
  },

  updatePlanModules: async ({ planId, moduleIds }) => {
    if (!planId || !Array.isArray(moduleIds)) {
      throw new ApiError(400, "Plan ID and moduleIds array are required");
    }
    const existingPlan = await db.plan.findUnique({ where: { id: planId } });
    if (!existingPlan) throw new ApiError(404, "Plan not found");

    await assertModuleIdsAttachable(moduleIds);

    await db.planModule.deleteMany({ where: { planId } });
    const newModules = [...new Set(moduleIds)].map((moduleId) => ({
      planId,
      moduleId,
    }));

    if (newModules.length > 0) {
      await db.planModule.createMany({ data: newModules });
    }
    await invalidateAllForPlan(planId);

    return db.plan.findUnique({
      where: { id: planId },
      include: {
        planModules: {
          include: { module: { select: MODULE_PLAN_SELECT } },
        },
      },
    });
  },

  updatePlanDetails: async ({
    planId,
    name,
    maxUsers,
    maxStartups,
    storageLimit,
    featuresInArray,
  }) => {
    if (!planId) throw new ApiError(400, "Plan ID is required");

    const existingPlan = await db.plan.findUnique({ where: { id: planId } });
    if (!existingPlan) throw new ApiError(404, "Plan not found");

    return db.plan.update({
      where: { id: planId },
      data: {
        ...(name && { name }),
        ...(maxUsers && { maxUsers }),
        ...(maxStartups && { maxStartups }),
        ...(storageLimit && { storageLimit }),
        ...(featuresInArray && { features: JSON.parse(featuresInArray) }),
      },
      include: {
        planModules: {
          include: { module: { select: MODULE_PLAN_SELECT } },
        },
      },
    });
  },
};
