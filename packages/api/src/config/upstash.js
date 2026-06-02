const { createClient } = require('redis');

let client        = null;
let isReady       = false;

const connectUpstash = async () => {
  client = createClient({
    url: process.env.UPSTASH_REDIS_URL,   // rediss:// — TLS enforced by Upstash
    socket: {
      tls:               true,
      rejectUnauthorized: true,
      connectTimeout:    5_000,
      reconnectStrategy: (retries) => {
        if (retries >= 5) { isReady = false; return false; }
        return Math.min(retries * 300, 3_000);
      },
    },
  });

  client.on('ready', () => { isReady = true;  console.log('[upstash] Redis connected'); });
  client.on('error', (e) => { isReady = false; console.error('[upstash] Error:', e.message); });
  client.on('end',   () => { isReady = false; });

  await client.connect();
};

// ─── Key/Value helpers ────────────────────────────────────────────────────────

const set = async (key, value, ttlSeconds) => {
  if (!isReady) return;
  const opts = ttlSeconds ? { EX: ttlSeconds } : {};
  await client.set(key, JSON.stringify(value), opts);
};

const get = async (key) => {
  if (!isReady) return null;
  const raw = await client.get(key);
  return raw ? JSON.parse(raw) : null;
};

const del  = async (key)          => isReady && client.del(key);
const incr = async (key)          => isReady && client.incr(key);
const expire = async (key, secs)  => isReady && client.expire(key, secs);
const ttl  = async (key)          => isReady ? client.ttl(key) : -1;

// ─── Pub/Sub ──────────────────────────────────────────────────────────────────

const publish   = async (channel, msg) => isReady && client.publish(channel, JSON.stringify(msg));
const subscribe = async (channel, handler) => {
  const sub = client.duplicate();
  await sub.connect();
  await sub.subscribe(channel, (msg) => handler(JSON.parse(msg)));
  return sub;
};

// ─── Queue helpers (simple list-based) ───────────────────────────────────────

const enqueue  = async (queue, job) => isReady && client.rPush(queue, JSON.stringify(job));
const dequeue  = async (queue)      => {
  if (!isReady) return null;
  const raw = await client.lPop(queue);
  return raw ? JSON.parse(raw) : null;
};
const queueLen = async (queue)      => isReady ? client.lLen(queue) : 0;

const getClient    = () => client;
const isRedisReady = () => isReady;

module.exports = {
  connectUpstash, getClient, isRedisReady,
  set, get, del, incr, expire, ttl,
  publish, subscribe,
  enqueue, dequeue, queueLen,
};
