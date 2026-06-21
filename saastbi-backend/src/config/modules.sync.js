import db from "../db/db.js";
import { MODULE_REGISTRY } from "./modules.registry.js";

export async function syncModuleRegistry() {
  let upsertedModules = 0;
  let upsertedPermissions = 0;
  let softDisabledModules = 0;

  const registryKeys = new Set(MODULE_REGISTRY.map((m) => m.key));

  for (const entry of MODULE_REGISTRY) {
    const mod = await db.module.upsert({
      where: { moduleKey: entry.key },
      update: {
        moduleName: entry.moduleName,
        moduleDescription: entry.moduleDescription,
        category: entry.category,
        displayOrder: entry.displayOrder,
        isCore: entry.isCore,
        isActive: true,
      },
      create: {
        moduleKey: entry.key,
        moduleName: entry.moduleName,
        moduleDescription: entry.moduleDescription,
        category: entry.category,
        displayOrder: entry.displayOrder,
        isCore: entry.isCore,
        isActive: true,
      },
    });
    upsertedModules += 1;

    for (const action of entry.actions) {
      const existing = await db.permission.findFirst({
        where: { moduleId: mod.id, action },
        select: { id: true },
      });
      if (!existing) {
        await db.permission.create({
          data: { moduleId: mod.id, action },
        });
        upsertedPermissions += 1;
      }
    }
  }

  const orphanModules = await db.module.findMany({
    where: { isActive: true, moduleKey: { notIn: [...registryKeys] } },
    select: { id: true, moduleKey: true },
  });

  for (const orphan of orphanModules) {
    await db.module.update({
      where: { id: orphan.id },
      data: { isActive: false },
    });
    softDisabledModules += 1;
    console.warn(
      `[modules.sync] module "${orphan.moduleKey}" is no longer in the registry; soft-disabled (isActive=false). PlanModule rows are preserved for audit.`
    );
  }

  const integrity = await runIntegrityCheck(registryKeys);

  console.log(
    `[modules.sync] synced ${upsertedModules} modules, created ${upsertedPermissions} new permissions, soft-disabled ${softDisabledModules} orphan modules (registry=${integrity.registrySize}, dbActive=${integrity.dbActiveCount}, duplicates=${integrity.duplicates.length})`
  );

  if (integrity.duplicates.length > 0 || integrity.missingFromDb.length > 0) {
    const message =
      `[modules.sync] integrity drift detected: missingFromDb=[${integrity.missingFromDb.join(",")}] duplicateModuleKeys=[${integrity.duplicates.join(",")}]`;
    console.error(message);
    if ((process.env.MODULE_SYNC_STRICT || "").toLowerCase() === "on") {
      throw new Error(message);
    }
  }

  return {
    upsertedModules,
    upsertedPermissions,
    softDisabledModules,
    integrity,
  };
}

async function runIntegrityCheck(registryKeys) {
  const keys = [...registryKeys];

  const [dbModules, duplicateGroups] = await Promise.all([
    db.module.findMany({
      where: { moduleKey: { in: keys } },
      select: { moduleKey: true, isActive: true },
    }),
    db.module.groupBy({
      by: ["moduleKey"],
      _count: { moduleKey: true },
      having: { moduleKey: { _count: { gt: 1 } } },
    }),
  ]);

  const presentKeys = new Set(dbModules.map((m) => m.moduleKey));
  const missingFromDb = keys.filter((k) => !presentKeys.has(k));
  const duplicates = duplicateGroups.map((g) => g.moduleKey);
  const dbActiveCount = dbModules.filter((m) => m.isActive).length;

  return {
    registrySize: keys.length,
    dbActiveCount,
    missingFromDb,
    duplicates,
  };
}
