import { createClient } from "redis";

export const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => {
  console.error("Redis Client Error:", err);
});

redisClient.on("connect", () => {
  console.log("Redis Connected Successfully");
});

await redisClient.connect();


export async function setRedis(key, value, ttl = 300) {
  if (ttl) {
    return await redisClient.set(key, value, { EX: ttl });
  }
  return await redisClient.set(key, value);
}

export async function getRedis(key) {
  return await redisClient.get(key);
}

export async function deleteRedis(key) {
  return await redisClient.del(key);
}

/**
 * Invalidate the cached tenant data in Redis.
 * Call this after any db.tenant.update that changes status, planId, or identity fields.
 * Accepts tenantId (not tenantKey) since most service methods work with tenantId.
 */
export async function invalidateTenantCache(tenantId) {
  try {
    const { default: db } = await import("../db/db.js");
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { tenantKey: true },
    });
    if (tenant?.tenantKey) {
      await redisClient.del(tenant.tenantKey);
    }
  } catch (err) {
    console.error("Failed to invalidate tenant cache:", err.message);
  }
}

/**
 * Flush ALL access cache keys (access:tenant:*) and membership cache keys.
 * Use on server boot after deploying cache-invalidation fixes to clear stale entries.
 */
export async function flushAccessCache() {
  try {
    const accessKeys = await redisClient.keys("access:tenant:*");
    const memberKeys = await redisClient.keys("membership:*");
    const allKeys = [...accessKeys, ...memberKeys];
    if (allKeys.length > 0) {
      await redisClient.del(allKeys);
    }
    console.log(`[redis] flushed ${allKeys.length} stale cache keys (${accessKeys.length} access, ${memberKeys.length} membership)`);
  } catch (err) {
    console.error("[redis] failed to flush access cache:", err.message);
  }
}

export default redisClient;
