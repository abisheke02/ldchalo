const fs = require('fs');
const path = require('path');
const { pool } = require('./database');

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../../migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      run_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  for (const file of files) {
    const { rows } = await pool.query('SELECT 1 FROM migrations WHERE filename = $1', [file]);
    if (rows.length > 0) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await pool.query(sql);
    await pool.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
    console.log(`[Migration] Applied: ${file}`);
  }
}

module.exports = { runMigrations };
