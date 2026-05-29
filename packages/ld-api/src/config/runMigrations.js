// Runs all SQL migration files in order on every startup.
// Tracks applied migrations in a `schema_migrations` table.
// Safe to call multiple times — already-applied migrations are skipped.

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const runMigrations = async () => {
  const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME     || 'ld_platform',
    user:     process.env.DB_USER     || 'ld_user',
    password: process.env.DB_PASSWORD || 'ld_password_dev',
    ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();
  try {
    // Create tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   VARCHAR(200) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Find all SQL files in migrations directory, sorted numerically
    const migrationsDir = path.join(__dirname, '../../migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('[migrations] No migrations directory found, skipping.');
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort(); // alphabetical sort works because files are prefixed 001_, 002_, etc.

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT filename FROM schema_migrations WHERE filename = $1',
        [file]
      );
      if (rows.length > 0) continue; // already applied

      console.log(`[migrations] Applying ${file}…`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`[migrations] ✓ ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[migrations] ✗ ${file}: ${err.message}`);
        throw err; // stop server startup on migration failure
      }
    }

    console.log('[migrations] All migrations up to date.');
  } finally {
    client.release();
    await pool.end();
  }
};

module.exports = { runMigrations };
