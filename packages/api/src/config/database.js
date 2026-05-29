const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'school_erp',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message);
});

const query = (text, params) => pool.query(text, params);

const connectDB = async () => {
  const client = await pool.connect();
  client.release();
  console.log('[db] PostgreSQL connected');
};

module.exports = { pool, query, connectDB };
