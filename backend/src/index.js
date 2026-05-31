require('./config/env');
const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const runMigrations = require('./db/migrate');
const errorHandler  = require('./middleware/errorHandler');
const env           = require('./config/env');

const app = express();

// ── Security & parsing ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: env.cors.origins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// ── Rate limiting ───────────────────────────────────────────────────────────
const apiLimiter  = rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 60_000, max: 20,  standardHeaders: true, legacyHeaders: false });

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// ── Health check ────────────────────────────────────────────────────────────
app.get('/ping', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/schools',    require('./routes/shared/schools'));
app.use('/api/students',   require('./routes/shared/students'));
app.use('/api/analytics',  require('./routes/shared/analytics'));
app.use('/api/payments',   require('./routes/shared/payments'));
app.use('/api/admin',      require('./routes/shared/admin'));
app.use('/api/reports',    require('./routes/shared/reports'));

// School ERP
app.use('/api/school/attendance',     require('./routes/school/attendance'));
app.use('/api/school/fees',           require('./routes/school/fees'));
app.use('/api/school/staff',          require('./routes/school/staff'));
app.use('/api/school/timetable',      require('./routes/school/timetable'));
app.use('/api/school/admissions',     require('./routes/school/admissions'));
app.use('/api/school/examinations',   require('./routes/school/examinations'));
app.use('/api/school/communications', require('./routes/school/communications'));

// School ERP — Expanded (Chalo ERP Blueprint)
app.use('/api/school/masters/academic',      require('./routes/school/masters/academic'));
app.use('/api/school/masters/demographics',  require('./routes/school/masters/demographics'));
app.use('/api/school/masters/time-config',   require('./routes/school/masters/time-config'));
app.use('/api/school/branches',              require('./routes/school/branches'));
app.use('/api/school/roles',                 require('./routes/school/roles'));
app.use('/api/school/users',                 require('./routes/school/users'));
app.use('/api/school/holidays',              require('./routes/school/holidays'));
app.use('/api/school/events',                require('./routes/school/events'));
app.use('/api/school/fee-collections',       require('./routes/school/fee-collections'));
app.use('/api/school/fee-concessions',       require('./routes/school/fee-concessions'));
app.use('/api/school/fee-refunds',           require('./routes/school/fee-refunds'));
app.use('/api/school/day-closure',           require('./routes/school/day-closure'));
app.use('/api/school/payments-online',       require('./routes/school/payments-online'));
app.use('/api/school/transport',             require('./routes/school/transport'));
app.use('/api/school/visitors',              require('./routes/school/visitors'));
app.use('/api/school/approvals',             require('./routes/school/approvals'));

// LD Platform
app.use('/api/ld/screening',         require('./routes/ld/screening'));
app.use('/api/ld/practice',          require('./routes/ld/practice'));
app.use('/api/ld/tests',             require('./routes/ld/tests'));
app.use('/api/ld/recommendations',   require('./routes/ld/recommendations'));
app.use('/api/ld/messages',          require('./routes/ld/messages'));
app.use('/api/ld/tts',               require('./routes/ld/tts'));

// ── Error handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
async function start() {
  try {
    console.log('[App] Running migrations…');
    await runMigrations();
    console.log('[App] Migrations done.');
  } catch (err) {
    console.error('[App] Migration failed:', err.message);
    process.exit(1);
  }

  app.listen(env.port, () => {
    console.log(`[App] API running on port ${env.port} (${env.nodeEnv})`);
  });
}

start();
