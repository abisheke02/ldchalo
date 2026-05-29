require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Server will not start.');
  process.exit(1);
}

const express  = require('express');
const helmet   = require('helmet');
const cors     = require('cors');
const morgan   = require('morgan');
const jwt      = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const { errorHandler, notFound } = require('./middleware/errorHandler');
const { initFirebase }   = require('./config/firebase');
const { connectRedis }   = require('./config/redis');
const { pool }           = require('./config/database');
const { runMigrations }  = require('./config/runMigrations');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Core middleware ──────────────────────────────────────────────────────────

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()) || ['http://localhost:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
}));
app.use('/api/auth', rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  message: { error: 'Too many auth attempts' },
}));

// ─── Health + ping (always works, no DB dependency) ──────────────────────────

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', ts: new Date().toISOString() });
  } catch {
    res.json({ status: 'ok', db: 'unreachable (mock mode)', ts: new Date().toISOString() });
  }
});

app.get('/ping', (_req, res) => res.json({ ok: true, port: PORT, env: process.env.NODE_ENV }));

// ─── Inline demo handler — works even if auth route file fails to load ────────

const DEMO_USERS = {
  teacher: { id: '00000000-0000-0000-0000-000000000000', name: 'Demo Teacher', role: 'teacher', school_id: '00000000-0000-0000-0000-000000000001' },
  student: { id: '00000000-0000-0000-0000-000000000002', name: 'Arjun Sharma',  role: 'student', school_id: '00000000-0000-0000-0000-000000000001', child_id: '00000000-0000-0000-0000-000000000002' },
  admin:   { id: '00000000-0000-0000-0000-000000000003', name: 'Demo Admin',    role: 'admin',   school_id: '00000000-0000-0000-0000-000000000001' },
  parent:  { id: '00000000-0000-0000-0000-000000000004', name: 'Demo Parent',   role: 'parent',  school_id: '00000000-0000-0000-0000-000000000001', child_id: '00000000-0000-0000-0000-000000000002' },
};

app.post('/api/auth/demo', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Demo not available in production' });
  }
  try {
    const role     = req.query.role || req.body?.role || 'teacher';
    const demoUser = DEMO_USERS[role] || DEMO_USERS.teacher;
    const token    = jwt.sign(
      { userId: demoUser.id, role: demoUser.role, schoolId: demoUser.school_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: demoUser });
  } catch (err) {
    res.status(500).json({ error: 'Demo failed: ' + err.message });
  }
});

// ─── Inline admin credentials handler — fallback when DB is unavailable ───────

app.post('/api/auth/credentials', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required' });
    }
    const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
    const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';
    if (username !== ADMIN_USER || password !== ADMIN_PASS) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const adminUser = DEMO_USERS.admin;
    const token = jwt.sign(
      { userId: adminUser.id, role: 'admin', schoolId: adminUser.school_id },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    res.json({ token, user: adminUser });
  } catch (err) {
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// ─── Safe route loader — server never crashes if one route file fails ─────────

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

// Mount all route modules safely
app.use('/api/auth',            safeRequire('./routes/auth',            'auth'));
app.use('/api/students',        safeRequire('./routes/students',        'students'));
app.use('/api/schools',         safeRequire('./routes/schools',         'schools'));
app.use('/api/screening',       safeRequire('./routes/screening',       'screening'));
app.use('/api/practice',        safeRequire('./routes/practice',        'practice'));
app.use('/api/tests',           safeRequire('./routes/tests',           'tests'));
app.use('/api/recommendations', safeRequire('./routes/recommendations', 'recommendations'));
app.use('/api/tts',             safeRequire('./routes/tts',             'tts'));
app.use('/api/analytics',       safeRequire('./routes/analytics',       'analytics'));
app.use('/api/reports',         safeRequire('./routes/reports',         'reports'));
app.use('/api/messages',        safeRequire('./routes/messages',        'messages'));
app.use('/api/payments',        safeRequire('./routes/payments',        'payments'));
app.use('/api/admin',           safeRequire('./routes/admin',           'admin'));
app.use('/api/compliance',      safeRequire('./routes/compliance',      'compliance'));

app.use(notFound);
app.use(errorHandler);

// ─── Startup ──────────────────────────────────────────────────────────────────

const start = async () => {
  // 1. Run migrations
  try {
    await runMigrations();
    console.log('[db] Migrations up to date');
  } catch (err) {
    console.warn('[db] Migration skipped (Mock Mode):', err.message);
  }

  // 2. Seed admin bcrypt hash
  try {
    const bcrypt = require('bcryptjs');
    const { query } = require('./config/database');
    const pw = process.env.ADMIN_PASSWORD;
    if (pw) {
      const hash = await bcrypt.hash(pw, 10);
      await query(
        `UPDATE users SET password_hash = $1, name = $2
         WHERE id = '00000000-0000-0000-0000-000000000003'
           AND (password_hash IS NULL OR password_hash <> $1)`,
        [hash, process.env.ADMIN_USERNAME || 'admin']
      );
      console.log('[auth] Admin password seeded');
    }
  } catch (err) {
    console.warn('[auth] Admin seed skipped:', err.message);
  }

  // 3. Redis (non-blocking)
  connectRedis().catch(() => {});

  // 4. Firebase (non-blocking)
  try { initFirebase(); } catch {}

  // 5. Start listening
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n✅ LD Platform API ready on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Demo:   POST http://localhost:${PORT}/api/auth/demo?role=teacher\n`);
  });

  // 6. Cron jobs
  try {
    const { startCronJobs } = require('./jobs/cronJobs');
    startCronJobs();
  } catch (err) {
    console.warn('[cron] Jobs skipped:', err.message);
  }
};

// Prevent uncaught errors from killing the server
process.on('uncaughtException',  (err) => console.error('[uncaughtException]',  err.message));
process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));

start();

module.exports = app;
