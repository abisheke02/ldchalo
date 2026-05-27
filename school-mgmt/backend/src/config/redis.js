const { createClient } = require('redis');

let redisClient;

async function connectRedis() {
  redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  redisClient.on('error', (err) => console.warn('[Redis] Error:', err.message));
  try {
    await redisClient.connect();
    console.log('[Redis] Connected');
  } catch (err) {
    console.warn('[Redis] Not available — continuing without cache');
    redisClient = null;
  }
}

function getRedis() { return redisClient; }

module.exports = { connectRedis, getRedis };
