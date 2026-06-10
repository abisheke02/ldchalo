const env = require('./env');

// ─── Demo mode: no-op Redis ────────────────────────────────────────
if (env.demoMode) {
  const noop = {
    get:    async () => null,
    set:    async () => 'OK',
    del:    async () => 1,
    expire: async () => 1,
    incr:   async () => 1,
    on:     () => noop,
    connect: async () => {},
  };
  module.exports = noop;
  return;
}

// ─── Real Redis connection ─────────────────────────────────────────
const Redis = require('ioredis');

const redis = new Redis(env.redis.url, {
  password:            env.redis.password,
  lazyConnect:         true,
  retryStrategy:       (times) => Math.min(times * 200, 3000),
  enableOfflineQueue:  false,
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => console.warn('[Redis] Connection error:', err.message));
redis.connect().catch(() => console.warn('[Redis] Could not connect — token blacklist disabled'));

module.exports = redis;
