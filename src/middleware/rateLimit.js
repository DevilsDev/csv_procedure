/**
 * Version: 2.5.5
 * Description: Fixed-window rate limiter middleware with a pluggable store.
 *              The default in-memory store is per-process and will not coordinate across multiple
 *              Node instances; for horizontal scaling, inject a shared store (e.g., Redis-backed)
 *              that implements hit(key, windowMs) -> { count, resetAt }.
 * Author: Ali Kahwaji
 */

function createMemoryStore() {
  const buckets = new Map();
  return {
    hit(key, windowMs) {
      const now = Date.now();
      const bucket = buckets.get(key);
      if (!bucket || now >= bucket.resetAt) {
        const fresh = { count: 1, resetAt: now + windowMs };
        buckets.set(key, fresh);
        return fresh;
      }
      bucket.count += 1;
      return bucket;
    },
    _reset() {
      buckets.clear();
    },
  };
}

function rateLimit({ windowMs = 60_000, max = 30, store = createMemoryStore() } = {}) {
  function getKey(req) {
    return req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  }

  return async function rateLimitMiddleware(req, res, next) {
    const key = getKey(req);
    let bucket;
    try {
      bucket = await store.hit(key, windowMs);
    } catch (err) {
      console.warn('[rateLimit] store error, allowing request:', err.message);
      return next();
    }

    if (bucket.count > max) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({ error: 'Too many requests. Please retry shortly.' });
    }

    return next();
  };
}

module.exports = rateLimit;
module.exports.createMemoryStore = createMemoryStore;
