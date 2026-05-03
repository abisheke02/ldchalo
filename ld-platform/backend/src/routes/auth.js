const express = require('express');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const {
  loginWithFirebaseToken,
  loginWithSupabaseToken,
  loginWithCredentials,
  refreshAccessToken,
  logout,
} = require('../services/authService');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── Demo users (dev only) ────────────────────────────────────────────────────

const DEMO_USERS = {
  teacher: { id: '00000000-0000-0000-0000-000000000000', name: 'Demo Teacher',  role: 'teacher', school_id: '00000000-0000-0000-0000-000000000001' },
  student: { id: '00000000-0000-0000-0000-000000000002', name: 'Arjun Sharma',  role: 'student', school_id: '00000000-0000-0000-0000-000000000001', child_id: '00000000-0000-0000-0000-000000000002' },
  admin:   { id: '00000000-0000-0000-0000-000000000003', name: 'Demo Admin',    role: 'admin',   school_id: '00000000-0000-0000-0000-000000000001' },
  parent:  { id: '00000000-0000-0000-0000-000000000004', name: 'Demo Parent',   role: 'parent',  school_id: '00000000-0000-0000-0000-000000000001', child_id: '00000000-0000-0000-0000-000000000002' },
};

// POST /api/auth/demo?role=teacher|student|admin|parent
router.post('/demo', (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Demo mode not available in production' });
    }
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'JWT_SECRET not configured on server. Check backend .env file.' });
    }
    const role     = req.query.role || req.body.role || 'teacher';
    const demoUser = DEMO_USERS[role] || DEMO_USERS.teacher;
    const token    = jwt.sign(
      { userId: demoUser.id, role: demoUser.role, schoolId: demoUser.school_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: demoUser });
  } catch (err) {
    console.error('[Demo] Error:', err.message);
    res.status(500).json({ error: 'Demo login failed: ' + err.message });
  }
});

// POST /api/auth/login  — Firebase (mobile) or Supabase (web) token
router.post('/login', async (req, res, next) => {
  try {
    const schema = Joi.object({
      firebaseIdToken: Joi.string().optional(),
      supabaseToken:   Joi.string().optional(),
      fcmToken:        Joi.string().optional(),
    }).or('firebaseIdToken', 'supabaseToken');

    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const result = value.supabaseToken
      ? await loginWithSupabaseToken(value.supabaseToken, value.fcmToken)
      : await loginWithFirebaseToken(value.firebaseIdToken, value.fcmToken);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/credentials — admin username + password login
// Password is compared using bcrypt against hash stored in DB.
// On first run, backend seeds the hash from ADMIN_PASSWORD env var.
router.post('/credentials', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    const result = await loginWithCredentials(username, password);
    res.json(result);
  } catch (err) {
    // Return 401 for auth failures, not 500
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Login failed' });
  }
});

// POST /api/auth/refresh — rotate refresh token, issue new access token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(401).json({ error: 'No refresh token provided' });
    const result = await refreshAccessToken(refreshToken);
    res.json(result);
  } catch (err) {
    res.status(err.status || 401).json({ error: err.message || 'Token refresh failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    await logout(token, req.user.userId);
    res.json({ message: 'Logged out successfully' });
  } catch {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
