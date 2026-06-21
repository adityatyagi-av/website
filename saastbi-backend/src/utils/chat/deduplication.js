import db from "../../db/db.js";

/**
 * Given an array of search results, deduplicate entities where a Page is
 * linked to a Startup or Tenant. Since conversations are always stored with
 * STARTUP/TENANT as participant type:
 *
 * - If BOTH Page and its owning Startup/Tenant appear -> remove the PAGE entry
 * - If ONLY Page appears (and it has an owning Startup/Tenant) -> convert to STARTUP/TENANT
 * - If ONLY Startup/Tenant appears (with a linked page) -> keep it (display resolves via page)
 *
 * A Page can only be linked to EITHER a Startup OR a Tenant, never both.
 */
export async function deduplicateLinkedEntities(results) {
  if (!results.length) return results;

  const pageIds = results.filter((r) => r.type === "PAGE").map((r) => r.id);
  const startupIds = results.filter((r) => r.type === "STARTUP").map((r) => r.id);
  const tenantIds = results.filter((r) => r.type === "TENANT").map((r) => r.id);

  if (!pageIds.length && !startupIds.length && !tenantIds.length) return results;

  // Maps: pageId -> owning entity
  const pageToOwner = new Map();
  const pageIdsToRemove = new Set();
  const startupIdsToRemove = new Set();
  const tenantIdsToRemove = new Set();

  // Find startups that own pages in our results
  if (pageIds.length) {
    const startupsOwningPages = await db.startup.findMany({
      where: { pageId: { in: pageIds } },
      select: { id: true, pageId: true, name: true, logoUrl: true },
    });
    for (const s of startupsOwningPages) {
      pageToOwner.set(s.pageId, { id: s.id, type: "STARTUP" });
    }

    const tenantsOwningPages = await db.tenant.findMany({
      where: { pageId: { in: pageIds } },
      select: { id: true, pageId: true, organizationName: true, tenantLogo: true },
    });
    for (const t of tenantsOwningPages) {
      pageToOwner.set(t.pageId, { id: t.id, type: "TENANT" });
    }
  }

  // If a startup has a pageId and that page is also in results, remove the page
  if (startupIds.length) {
    const startups = await db.startup.findMany({
      where: { id: { in: startupIds }, pageId: { not: null } },
      select: { id: true, pageId: true },
    });
    for (const s of startups) {
      if (pageIds.includes(s.pageId)) {
        pageIdsToRemove.add(s.pageId);
      }
    }
  }

  // If a tenant has a pageId and that page is also in results, remove the page
  if (tenantIds.length) {
    const tenants = await db.tenant.findMany({
      where: { id: { in: tenantIds }, pageId: { not: null } },
      select: { id: true, pageId: true },
    });
    for (const t of tenants) {
      if (pageIds.includes(t.pageId)) {
        pageIdsToRemove.add(t.pageId);
      }
    }
  }

  const output = [];

  for (const r of results) {
    if (r.type === "PAGE") {
      if (pageIdsToRemove.has(r.id)) {
        // Owning STARTUP/TENANT is already in results, skip the page
        continue;
      }

      const owner = pageToOwner.get(r.id);
      if (owner) {
        // Page belongs to a Startup/Tenant not in results -> convert to owner entity
        // but keep the page display info (name/avatar)
        output.push({
          ...r,
          id: owner.id,
          type: owner.type,
          displayAs: "PAGE",
          linkedPageId: r.id,
        });
      } else {
        // Standalone page, no owner -> keep as PAGE
        output.push(r);
      }
    } else if (r.type === "STARTUP" && startupIdsToRemove.has(r.id)) {
      continue;
    } else if (r.type === "TENANT" && tenantIdsToRemove.has(r.id)) {
      continue;
    } else {
      output.push(r);
    }
  }

  return output;
}

/**
 * Deduplicate search results where the same real user appears under
 * multiple entity types (e.g., INCUBATION_USER + USER, or same USER appearing
 * twice with different role labels like "Connected" and "Mentor").
 *
 * Groups by underlying User.id and merges into the highest-scoring entry.
 */
export async function deduplicateByRealUser(results) {
  if (!results.length) return results;

  const incUserIds = results
    .filter((r) => r.type === "INCUBATION_USER")
    .map((r) => r.id);

  const incUserToUserId = new Map();

  if (incUserIds.length) {
    const incUsers = await db.incubationUser.findMany({
      where: { id: { in: incUserIds }, userId: { not: null } },
      select: { id: true, userId: true },
    });
    for (const iu of incUsers) {
      incUserToUserId.set(iu.id, iu.userId);
    }
  }

  const groupByUser = new Map();

  for (const r of results) {
    let realUserId;
    if (r.type === "USER") {
      realUserId = r.id;
    } else if (r.type === "INCUBATION_USER") {
      realUserId = incUserToUserId.get(r.id) || `inc_${r.id}`;
    } else {
      // Non-user entities are never grouped
      groupByUser.set(`entity_${r.type}_${r.id}`, [r]);
      continue;
    }

    const key = `user_${realUserId}`;
    if (!groupByUser.has(key)) {
      groupByUser.set(key, []);
    }
    groupByUser.get(key).push(r);
  }

  const deduplicated = [];
  for (const [, group] of groupByUser) {
    if (group.length === 1) {
      deduplicated.push(group[0]);
      continue;
    }

    // Sort by proximity score descending, keep the highest
    group.sort((a, b) => (b.proximityScore || 0) - (a.proximityScore || 0));
    const primary = { ...group[0] };

    // Prefer USER type entry as the canonical result (for conversation targeting)
    const userEntry = group.find((g) => g.type === "USER");
    if (userEntry && primary.type !== "USER") {
      primary.id = userEntry.id;
      primary.type = "USER";
      primary.name = userEntry.name || primary.name;
      primary.avatar = userEntry.avatar || primary.avatar;
    }

    // Merge role labels
    const roles = group.map((g) => g.proximityLabel).filter(Boolean);
    if (roles.length > 1) {
      primary.roles = [...new Set(roles)];
      primary.proximityLabel = [...new Set(roles)].join(", ");
    }

    deduplicated.push(primary);
  }

  return deduplicated;
}
