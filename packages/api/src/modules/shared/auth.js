const express = require('express');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const {
  loginWithFirebaseToken,
  loginWithSupabaseToken,
  loginWithCredentials,
  loginWithEmailPassword,
  registerUser,
  refreshAccessToken,
  logout,
} = require('../../services/authService');
const { requireAuth } = require('../../middleware/auth');
const { query } = require('../../config/database');

const router = express.Router();

// â”€â”€â”€ Demo users (dev only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// POST /api/auth/login  â€” email+password (web) | Firebase (mobile) | Supabase (legacy)
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, firebaseIdToken, supabaseToken, fcmToken } = req.body || {};

    if (email && password) {
      const result = await loginWithEmailPassword(email, password);
      return res.json(result);
    }

    if (firebaseIdToken) {
      const result = await loginWithFirebaseToken(firebaseIdToken, fcmToken);
      return res.json(result);
    }

    if (supabaseToken) {
      const result = await loginWithSupabaseToken(supabaseToken, fcmToken);
      return res.json(result);
    }

    return res.status(400).json({ error: 'Provide email+password or firebaseIdToken' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register â€” self-registration for teachers and parents
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body || {};
    const result = await registerUser({ name, email, password, role });
    res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

// POST /api/auth/credentials â€” admin username + password login
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

// POST /api/auth/refresh â€” rotate refresh token, issue new access token
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

// GET /api/auth/student-invite/:token â€” validate invite token
router.get('/student-invite/:token', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, email, invite_token_expires_at FROM users
       WHERE invite_token = $1 AND role = 'student'`,
      [req.params.token]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Invalid or expired invite link' });
    const user = result.rows[0];
    if (new Date(user.invite_token_expires_at) < new Date()) {
      return res.status(410).json({ error: 'This invite link has expired. Ask your teacher for a new one.' });
    }
    res.json({ name: user.name, email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Could not validate invite' });
  }
});

// POST /api/auth/student-invite/:token â€” activate student account (set password)
router.post('/student-invite/:token', async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const result = await query(
      `SELECT id, name, email, role, school_id, invite_token_expires_at FROM users
       WHERE invite_token = $1 AND role = 'student'`,
      [req.params.token]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Invalid or expired invite link' });
    const user = result.rows[0];
    if (new Date(user.invite_token_expires_at) < new Date()) {
      return res.status(410).json({ error: 'This invite link has expired. Ask your teacher for a new one.' });
    }

    const hash = await bcrypt.hash(password, 10);
    await query(
      `UPDATE users SET password_hash = $1, invite_token = NULL, invite_token_expires_at = NULL WHERE id = $2`,
      [hash, user.id]
    );

    const token = jwt.sign(
      { userId: user.id, role: user.role, schoolId: user.school_id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, school_id: user.school_id },
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not activate account' });
  }
});

module.exports = router;
