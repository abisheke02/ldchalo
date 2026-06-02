#!/usr/bin/env node
/**
 * Cloud DB Setup Script
 * Connects to all 4 cloud services and applies schemas/indexes.
 *
 * Usage:
 *   cd D:\school
 *   node scripts/setup-cloud-db.js [--service=all|neon|mongo|databricks]
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const fs   = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.resolve(__dirname, '../packages/api/migrations');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const banner = (text) => {
  const line = '─'.repeat(60);
  console.log(`\n${line}`);
  console.log(`  ${text}`);
  console.log(line);
};

const checkEnv = (vars) => {
  const missing = vars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    console.error(`\n❌ Missing env vars: ${missing.join(', ')}`);
    console.error('   Copy .env.example → .env and fill in your credentials.\n');
    process.exit(1);
  }
};

const arg = (name) => {
  const flag = process.argv.find((a) => a.startsWith(`--${name}=`));
  return flag ? flag.split('=')[1] : null;
};

const service = arg('service') || 'all';

// ─── 1. NEON (PostgreSQL) ─────────────────────────────────────────────────────

async function setupNeon() {
  banner('Setting up Neon PostgreSQL');
  checkEnv(['NEON_DB_URL']);

  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.NEON_DB_URL,
    ssl: { rejectUnauthorized: true },
    max: 3,
  });

  // Bootstrap migrations table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT        PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const { rows: applied } = await pool.query('SELECT version FROM schema_migrations ORDER BY version');
  const done = new Set(applied.map((r) => r.version));

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let ran = 0;
  for (const file of files) {
    if (done.has(file)) {
      console.log(`  [skip] ${file}`);
      continue;
    }

    const sql    = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(`INSERT INTO schema_migrations(version) VALUES($1)`, [file]);
      await client.query('COMMIT');
      console.log(`  ✓ ${file}`);
      ran++;
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${file} failed:\n  ${err.message}`);
    } finally {
      client.release();
    }
  }

  await pool.end();
  console.log(`\n  Neon: ${ran} migrations applied, ${done.size} already done ✅`);
}

// ─── 2. MONGODB ATLAS ─────────────────────────────────────────────────────────

async function setupMongo() {
  banner('Setting up MongoDB Atlas');
  checkEnv(['MONGODB_URL']);

  // Delegate to the dedicated mongo setup script
  const { execSync } = require('child_process');
  execSync(
    `node ${path.resolve(__dirname, '../packages/api/src/db/mongodb/setup.js')}`,
    { stdio: 'inherit', env: process.env }
  );
}

// ─── 3. UPSTASH REDIS ─────────────────────────────────────────────────────────

async function setupUpstash() {
  banner('Verifying Upstash Redis connection');
  checkEnv(['UPSTASH_REDIS_URL']);

  const { createClient } = require('redis');
  const client = createClient({
    url: process.env.UPSTASH_REDIS_URL,
    socket: { tls: true, rejectUnauthorized: true, connectTimeout: 5_000 },
  });

  await client.connect();
  const pong = await client.ping();
  console.log(`  PING → ${pong}`);

  // Seed queue existence check (LLEN on empty list = 0, that's fine)
  const { KEYS } = require('../packages/api/src/config/redis-keys');
  for (const [name, queue] of Object.entries(KEYS.queues)) {
    const len = await client.lLen(queue);
    console.log(`  queue:${name.padEnd(22)} → "${queue}"  (${len} jobs)`);
  }

  await client.disconnect();
  console.log('\n  Upstash Redis ready ✅');
}

// ─── 4. DATABRICKS ────────────────────────────────────────────────────────────

async function setupDatabricks() {
  banner('Setting up Databricks Analytics Schema');
  checkEnv(['DATABRICKS_HOST', 'DATABRICKS_TOKEN', 'DATABRICKS_HTTP_PATH']);

  const { DBSQLClient } = require('@databricks/sql');

  const client = new DBSQLClient();
  await client.connect({
    host:  process.env.DATABRICKS_HOST.replace(/^https?:\/\//, ''),
    path:  process.env.DATABRICKS_HTTP_PATH,
    token: process.env.DATABRICKS_TOKEN,
  });

  const session = await client.openSession();
  const schemaSQL = fs.readFileSync(
    path.resolve(__dirname, '../packages/api/src/db/databricks/schema.sql'),
    'utf8'
  );

  // Split on ; and run each statement individually
  const statements = schemaSQL
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    const op = await session.executeStatement(stmt + ';', { runAsync: false });
    await op.close();
    const preview = stmt.replace(/\s+/g, ' ').slice(0, 70);
    console.log(`  ✓ ${preview}…`);
  }

  await session.close();
  await client.close();
  console.log('\n  Databricks schema ready ✅');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

(async () => {
  console.log('\n🚀 Cloud DB Setup — School ERP + LD Platform');
  console.log(`   Services: ${service}\n`);

  try {
    if (service === 'all' || service === 'neon')        await setupNeon();
    if (service === 'all' || service === 'mongo')       await setupMongo();
    if (service === 'all' || service === 'redis')       await setupUpstash();
    if (service === 'all' || service === 'databricks')  await setupDatabricks();

    console.log('\n✅ All cloud databases ready. Copy .env.example → .env, fill credentials, run: npm run dev\n');
  } catch (err) {
    console.error('\n❌ Setup failed:', err.message);
    process.exit(1);
  }
})();
