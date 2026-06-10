const fs   = require('fs');
const path = require('path');
const { pool } = require('../config/database');

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        run_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const dir   = path.join(__dirname, '..', '..', 'migrations');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      const { rows } = await client.query('SELECT 1 FROM schema_migrations WHERE version = $1', [file]);
      if (rows.length) continue;

      console.log(`[DB] Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(dir, file), 'utf8').replace(/^﻿/, '');
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`[DB] Migration complete: ${file}`);
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = runMigrations;
