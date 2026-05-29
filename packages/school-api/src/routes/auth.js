const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { getRedis } = require('../config/redis');
const { authenticate } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES = '24h';
const REFRESH_EXPIRES = '30d';

function signTokens(payload) {
  const access = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  const refresh = jwt.sign({ ...payload, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_EXPIRES });
  return { access, refresh };
}

// Admin login (username + password)
router.post('/login/admin', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const tokens = signTokens({ role: 'super_admin', sub: 'admin' });
    res.json(tokens);
  } catch (err) { next(err); }
});

// Phone OTP request
router.post('/otp/request', async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone required' });
    // TODO: integrate Supabase OTP or Firebase Phone Auth
    res.json({ message: 'OTP sent', phone });
  } catch (err) { next(err); }
});

// Phone OTP verify
router.post('/otp/verify', async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    // TODO: verify OTP with Supabase/Firebase
    const { rows } = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const user = rows[0];
    const tokens = signTokens({ sub: user.id, role: user.role, school_id: user.school_id });
    res.json({ ...tokens, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) { next(err); }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    const payload = jwt.verify(refresh_token, JWT_SECRET);
    if (payload.type !== 'refresh') throw new Error('Invalid token type');
    const { sub, role, school_id } = payload;
    const tokens = signTokens({ sub, role, school_id });
    res.json(tokens);
  } catch { res.status(401).json({ error: 'Invalid refresh token' }); }
});

// Logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const redis = getRedis();
    if (redis) await redis.set(`blacklist:${token}`, '1', { EX: 86400 });
    res.json({ message: 'Logged out' });
  } catch (err) { next(err); }
});

module.exports = router;
