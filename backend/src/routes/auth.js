const router   = require('express').Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const { query } = require('../config/database');
const redis    = require('../config/redis');
const env      = require('../config/env');
const { requireAuth } = require('../middleware/auth');

const sign = (payload) => jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });

// Email + password login (teachers, school admins)
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    const user = rows[0];
    if (!user?.password_hash) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = sign({ id: user.id, role: user.role, schoolId: user.school_id });
    const { password_hash: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) { next(err); }
});

// Admin login (username + password from env)
router.post('/credentials', async (req, res) => {
  const { username, password } = req.body;
  if (username !== env.admin.username || password !== env.admin.password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = sign({ id: 'admin', role: 'super_admin', schoolId: null });
  res.json({ token, user: { id: 'admin', role: 'super_admin', name: 'Administrator' } });
});

// Register (create teacher account)
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });

    const exists = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO users (id, name, email, phone, password_hash, role)
       VALUES ($1,$2,$3,$4,$5,'teacher') RETURNING id, name, email, phone, role, school_id, created_at`,
      [uuid(), name.trim(), email.toLowerCase().trim(), phone || null, hash]
    );
    const user  = rows[0];
    const token = sign({ id: user.id, role: user.role, schoolId: user.school_id });
    res.status(201).json({ token, user });
  } catch (err) { next(err); }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });

    const { rows } = await query(
      `SELECT rt.*, u.role, u.school_id FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token = $1 AND rt.expires_at > NOW() AND rt.revoked = FALSE`,
      [refreshToken]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid or expired refresh token' });

    const row   = rows[0];
    const token = sign({ id: row.user_id, role: row.role, schoolId: row.school_id });
    res.json({ token });
  } catch (err) { next(err); }
});

// Logout
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const decoded = jwt.decode(req.token);
    const ttl     = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 3600;
    if (ttl > 0) await redis.setex(`bl:${req.token}`, ttl, '1').catch(() => {});
  } catch { /* ignore */ }
  res.json({ ok: true });
});

// Me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, name, email, phone, role, school_id, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) { next(err); }
});

// Demo login
router.post('/demo', async (req, res, next) => {
  try {
    const { role = 'teacher' } = req.body;
    const allowed = ['teacher', 'student', 'parent', 'school_admin'];
    if (!allowed.includes(role)) return res.status(400).json({ error: 'Invalid demo role' });

    const { rows } = await query(
      `SELECT id, name, email, role, school_id FROM users
       WHERE role = $1 AND name ILIKE '%demo%' LIMIT 1`,
      [role]
    );
    if (!rows.length) return res.status(404).json({ error: `No demo ${role} account found` });

    const token = sign({ id: rows[0].id, role: rows[0].role, schoolId: rows[0].school_id });
    res.json({ token, user: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
