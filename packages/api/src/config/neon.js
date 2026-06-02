const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NEON_DB_URL,
  ssl: { rejectUnauthorized: true },
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => console.error('[neon] Pool error:', err.message));

const query = (text, params) => pool.query(text, params);

const connectNeon = async () => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT version()');
    console.log('[neon] Connected →', rows[0].version.split(' ').slice(0, 2).join(' '));
  } finally {
    client.release();
  }
};

module.exports = { pool, query, connectNeon };
