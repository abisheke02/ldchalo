const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'school_mgmt',
  user: process.env.DB_USER || 'school_user',
  password: process.env.DB_PASSWORD || 'school_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function connectDB() {
  try {
    const client = await pool.connect();
    console.log('[DB] PostgreSQL connected');
    client.release();
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, connectDB };
