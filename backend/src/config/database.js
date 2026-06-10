const { Pool } = require('pg');
const env      = require('./env');

// ─── Demo mode: no-op database that returns empty results ──────────
if (env.demoMode) {
  const noopQuery = async () => ({ rows: [], rowCount: 0 });
  module.exports = {
    pool:      null,
    query:     noopQuery,
    getClient: async () => ({
      query:   noopQuery,
      release: () => {},
    }),
  };
  return;
}

// ─── Real database pool ────────────────────────────────────────────
const pool = new Pool(
  env.db.url
    ? { connectionString: env.db.url, ssl: env.nodeEnv === 'production' ? { rejectUnauthorized: false } : false }
    : { host: env.db.host, port: env.db.port, database: env.db.name, user: env.db.user, password: env.db.password }
);

pool.on('error', (err) => console.error('[DB] Unexpected pool error:', err.message));

module.exports = {
  pool,
  query:     (...args) => pool.query(...args),
  getClient: ()        => pool.connect(),
};
