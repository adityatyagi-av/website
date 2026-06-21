import { redisClient, getRedis, setRedis } from "../config/redisClient.js";
import db from "../db/db.js";
import { ApiError } from "../utils/ApiError.js";

export async function repositoryRateLimiter(req, res, next) {
  const { apiKey } = req.params;
  if (!apiKey) {
    return next();
  }

  try {
    const configCacheKey = `repo_rl_config:${apiKey}`;
    let config;

    const cached = await getRedis(configCacheKey);
    if (cached) {
      config = JSON.parse(cached);
    } else {
      const repository = await db.publicRepository.findUnique({
        where: { apiKey },
        select: { isRateLimited: true, rateLimitPerMinute: true },
      });

      if (!repository) {
        throw new ApiError(404, "Repository not found");
      }

      config = {
        isRateLimited: repository.isRateLimited,
        rateLimitPerMinute: repository.rateLimitPerMinute,
      };

      await setRedis(configCacheKey, JSON.stringify(config), 300);
    }

    if (!config.isRateLimited) {
      return next();
    }

    const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
    const windowKey = `repo_rl:${apiKey}:${ip}`;
    const maxRequests = config.rateLimitPerMinute;

    const current = await redisClient.incr(windowKey);

    if (current === 1) {
      await redisClient.expire(windowKey, 60);
    }

    const ttl = await redisClient.ttl(windowKey);

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - current));
    res.setHeader("X-RateLimit-Reset", Math.ceil(Date.now() / 1000) + (ttl > 0 ? ttl : 60));

    if (current > maxRequests) {
      throw new ApiError(429, "Rate limit exceeded. Please try again later.");
    }

    next();
  } catch (err) {
    if (err instanceof ApiError) {
      return next(err);
    }
    console.error("Rate limiter error:", err);
    next();
  }
}
