// High-performance in-memory rate limiting with sliding window
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
 * Creates a rate limiter middleware with sliding window mechanics.
 */
export function rateLimit({ windowMs = 60_000, max = 30, message, prefix = "rl" } = {}) {
  return async function limiter(req, res, next) {
    const clientIp = req.ip || req.socket?.remoteAddress || "unknown";
    const routeKey = `${prefix}::${clientIp}::${req.baseUrl || ""}${req.path?.split("?")[0] || ""}`;

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
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({
        success: false,
        error: "Too Many Requests",
        retryAfter: retryAfterSec,
        message: message || "Too many requests. Please slow down and try again in a moment."
      });
    }
    next();
  };
}

