import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let redis = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch (err) {
    console.warn("[RateLimit] Upstash Redis initialization error:", err?.message || err);
  }
}

// In-memory fallback buckets
const inMemBuckets = new Map();

// Periodic cleanup of stale in-memory buckets
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, b] of inMemBuckets.entries()) {
    if (now > b.resetAt) inMemBuckets.delete(key);
  }
}, 10 * 60 * 1000);
cleanup.unref?.();

/**
 * Creates a rate limiter middleware using Upstash Redis if available, 
 * falling back to high-performance in-memory limiting.
 */
export function rateLimit({ windowMs = 60_000, max = 30, message, prefix = "rl" } = {}) {
  // If Redis is configured, create Upstash Ratelimit instance
  let upstashLimiter = null;
  if (redis) {
    try {
      // Ratelimit.slidingWindow takes window as string like "60 s", "1 m", etc.
      const seconds = Math.max(1, Math.round(windowMs / 1000));
      upstashLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(max, `${seconds} s`),
        analytics: true,
        prefix: `aura_rl:${prefix}`,
      });
    } catch (err) {
      console.warn("[RateLimit] Failed to create Upstash Ratelimit:", err?.message);
    }
  }

  return async function limiter(req, res, next) {
    // req.ip is resolved by Express using the configured `trust proxy` setting
    // (see app.js), which only trusts a fixed number of hops from a real
    // reverse proxy. Raw X-Forwarded-For is never trusted directly, since a
    // client can set that header to any value to spoof their IP.
    const clientIp = req.ip || req.socket?.remoteAddress || "unknown";
    const routeKey = `${clientIp}::${req.baseUrl || ""}${req.path?.split("?")[0] || ""}`;

    // 1. Try Upstash Redis if configured
    if (upstashLimiter) {
      try {
        const { success, limit, remaining, reset } = await upstashLimiter.limit(routeKey);
        res.setHeader("RateLimit-Limit", String(limit));
        res.setHeader("RateLimit-Remaining", String(remaining));
        res.setHeader("RateLimit-Reset", String(reset));

        if (!success) {
          res.setHeader("Retry-After", String(Math.ceil((reset - Date.now()) / 1000)));
          return res.status(429).json({
            success: false,
            message: message || "Too many requests. Please slow down and try again in a moment."
          });
        }
        return next();
      } catch (redisErr) {
        // Fallback to in-memory if Redis temporarily fails
        console.warn("[RateLimit] Upstash execution error, falling back to memory:", redisErr?.message);
      }
    }

    // 2. In-memory fallback limiting
    const now = Date.now();
    let bucket = inMemBuckets.get(routeKey);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      inMemBuckets.set(routeKey, bucket);
    }
    bucket.count += 1;

    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, max - bucket.count)));

    if (bucket.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({
        success: false,
        message: message || "Too many requests. Please slow down and try again in a moment."
      });
    }
    next();
  };
}

