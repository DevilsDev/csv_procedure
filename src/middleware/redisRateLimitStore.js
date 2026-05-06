/**
 * Version: 2.5.6
 * Description: Redis-backed store for rateLimit middleware. Implements the same
 *              { hit(key, windowMs) -> { count, resetAt } } contract as the in-memory store.
 *              Uses INCR + PEXPIRE NX for atomic fixed-window counting that survives across
 *              multiple Node processes.
 *
 *              ioredis is loaded lazily so projects that don't need Redis aren't forced to install it.
 *              To enable: `npm install ioredis` and set REDIS_URL.
 * Author: Ali Kahwaji
 */

const REDIS_KEY_PREFIX = 'clinisync:ratelimit:';

function loadIoredis() {
  try {
    return require('ioredis');
  } catch {
    throw new Error(
      'Redis rate-limit store requested but the "ioredis" package is not installed. ' +
      'Run `npm install ioredis` or unset REDIS_URL to fall back to the in-memory store.'
    );
  }
}

function createRedisStore({ url, client } = {}) {
  let redis = client;
  if (!redis) {
    if (!url) throw new Error('createRedisStore: pass either { client } or { url }');
    const Redis = loadIoredis();
    redis = new Redis(url, { lazyConnect: false });
  }

  return {
    async hit(key, windowMs) {
      const fullKey = REDIS_KEY_PREFIX + key;
      const pipeline = redis.multi();
      pipeline.incr(fullKey);
      pipeline.pexpire(fullKey, windowMs, 'NX');
      pipeline.pttl(fullKey);
      const results = await pipeline.exec();

      const count = Number(results[0][1]) || 0;
      const ttlMs = Number(results[2][1]);
      const resetAt = Date.now() + (ttlMs > 0 ? ttlMs : windowMs);
      return { count, resetAt };
    },
    async close() {
      if (!client) await redis.quit();
    },
  };
}

module.exports = { createRedisStore };
