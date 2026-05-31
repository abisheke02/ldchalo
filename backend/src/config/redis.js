const Redis = require('ioredis');
const env   = require('./env');

const redis = new Redis(env.redis.url, {
  password:           env.redis.password,
  lazyConnect:        true,
  retryStrategy:      (times) => Math.min(times * 200, 3000),
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
});

redis.on('error', (err) => console.warn('[Redis] Connection error:', err.message));
redis.connect().catch(() => console.warn('[Redis] Could not connect — token blacklist disabled'));

module.exports = redis;
