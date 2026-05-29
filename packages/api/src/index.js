require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set.');
  process.exit(1);
}

const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const morgan    = require('morgan');
const jwt       = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const { errorHandler, notFound } = require('./middleware/errorHandler');
const { initFirebase }  = require('./config/firebase');
const { connectRedis }  = require('./config/redis');
const { pool }          = require('./config/database');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Core middleware ──────────────────────────────────────────────────────────

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()) ||
          ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

app.use(rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth', rateLimit({
  windowMs: 60_000,
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  message: { error: 'Too many auth attempts' },
}));

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', ts: new Date().toISOString() });
  } catch {
    res.json({ status: 'ok', db: 'unreachable', ts: new Date().toISOString() });
  }
});

app.get('/ping', (_req, res) => res.json({ ok: true, port: PORT }));

// ─── Demo auth ────────────────────────────────────────────────────────────────

const DEMO_USERS = {
  teacher:  { id: '00000000-0000-0000-0000-000000000001', name: 'Demo Teacher',  role: 'teacher',  schoolId: '00000000-0000-0000-0000-000000000000' },
  student:  { id: '00000000-0000-0000-0000-000000000002', name: 'Demo Student',  role: 'student',  schoolId: '00000000-0000-0000-0000-000000000000' },
  admin:    { id: '00000000-0000-0000-0000-000000000003', name: 'Demo Admin',    role: 'admin',    schoolId: '00000000-0000-0000-0000-000000000000' },
  parent:   { id: '00000000-0000-0000-0000-000000000004', name: 'Demo Parent',   role: 'parent',   schoolId: '00000000-0000-0000-0000-000000000000' },
  principal:{ id: '00000000-0000-0000-0000-000000000005', name: 'Demo Principal',role: 'principal',schoolId: '00000000-0000-0000-0000-000000000000' },
};

app.post('/api/auth/demo', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Demo not available in production' });
  }
  const role     = req.query.role || req.body?.role || 'teacher';
  const demoUser = DEMO_USERS[role] || DEMO_USERS.teacher;
  const token    = jwt.sign(
    { userId: demoUser.id, role: demoUser.role, schoolId: demoUser.schoolId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token, user: demoUser });
});

// ─── Safe route loader ────────────────────────────────────────────────────────

const safeRequire = (path, label) => {
  try {
    return require(path);
  } catch (err) {
    console.error(`[routes] Failed to load ${label}: ${err.message}`);
    const router = express.Router();
    router.all('*', (_req, res) =>
      res.status(503).json({ error: `${label} unavailable`, detail: err.message })
    );
    return router;
  }
};

// ─── Shared routes (used by both ERP and LD) ─────────────────────────────────

app.use('/api/auth',     safeRequire('./modules/shared/auth',     'auth'));
app.use('/api/schools',  safeRequire('./modules/shared/schools',  'schools'));
app.use('/api/students', safeRequire('./modules/shared/students', 'students'));
app.use('/api/analytics',safeRequire('./modules/shared/analytics','analytics'));
app.use('/api/reports',  safeRequire('./modules/shared/reports',  'reports'));
app.use('/api/payments', safeRequire('./modules/shared/payments', 'payments'));
app.use('/api/admin',    safeRequire('./modules/shared/admin',    'admin'));

// ─── School ERP module routes (/api/school/*) ─────────────────────────────────

app.use('/api/school/staff',         safeRequire('./modules/school/staff',         'staff'));
app.use('/api/school/admissions',    safeRequire('./modules/school/admissions',    'admissions'));
app.use('/api/school/attendance',    safeRequire('./modules/school/attendance',    'attendance'));
app.use('/api/school/timetable',     safeRequire('./modules/school/timetable',     'timetable'));
app.use('/api/school/examinations',  safeRequire('./modules/school/examinations',  'examinations'));
app.use('/api/school/fees',          safeRequire('./modules/school/fees',          'fees'));
app.use('/api/school/communications',safeRequire('./modules/school/communications','communications'));
app.use('/api/school/library',       safeRequire('./modules/school/library',       'library'));
app.use('/api/school/transport',     safeRequire('./modules/school/transport',     'transport'));
app.use('/api/school/payroll',       safeRequire('./modules/school/payroll',       'payroll'));

// ─── LD Platform module routes (/api/ld/*) ───────────────────────────────────

app.use('/api/ld/screening',       safeRequire('./modules/ld/screening',       'ld:screening'));
app.use('/api/ld/practice',        safeRequire('./modules/ld/practice',        'ld:practice'));
app.use('/api/ld/tests',           safeRequire('./modules/ld/tests',           'ld:tests'));
app.use('/api/ld/recommendations', safeRequire('./modules/ld/recommendations', 'ld:recommendations'));
app.use('/api/ld/messages',        safeRequire('./modules/ld/messages',        'ld:messages'));
app.use('/api/ld/tts',             safeRequire('./modules/ld/tts',             'ld:tts'));
app.use('/api/ld/compliance',      safeRequire('./modules/ld/compliance',      'ld:compliance'));

app.use(notFound);
app.use(errorHandler);

// ─── Startup ──────────────────────────────────────────────────────────────────

const start = async () => {
  try {
    const { runMigrations } = require('./db/migrate');
    await runMigrations();
    console.log('[db] Migrations up to date');
  } catch (err) {
    console.warn('[db] Migration skipped:', err.message);
  }

  connectRedis().catch(() => {});

  try { initFirebase(); } catch {}

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅ School ERP API ready — port ${PORT}`);
    console.log(`   Health:  http://localhost:${PORT}/health`);
    console.log(`   School:  /api/school/*`);
    console.log(`   LD:      /api/ld/*\n`);
  });

  try {
    const { startCronJobs } = require('./jobs/cronJobs');
    startCronJobs();
  } catch (err) {
    console.warn('[cron] Jobs skipped:', err.message);
  }
};

process.on('uncaughtException',  (err) => console.error('[uncaughtException]',  err.message));
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));

start();

module.exports = app;
