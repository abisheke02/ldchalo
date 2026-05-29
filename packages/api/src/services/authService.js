const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { verifyIdToken } = require('../config/firebase');
const { set, del } = require('../config/redis');
const { supabase } = require('../config/supabase');
const { resolveParentLink } = require('./schoolService');

const ACCESS_TOKEN_TTL   = '24h';
const REFRESH_TOKEN_DAYS = 30;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

// ─── Refresh Token ────────────────────────────────────────────────────────────

const issueRefreshToken = async (userId) => {
  const rawToken  = uuidv4();
  const hash      = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 3600 * 1000);

  await query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
     VALUES (uuid_generate_v4(), $1, $2, $3)`,
    [userId, hash, expiresAt]
  );

  return rawToken;
};

const refreshAccessToken = async (rawRefreshToken) => {
  if (!rawRefreshToken) throw Object.assign(new Error('No refresh token'), { status: 401 });

  const hash   = hashToken(rawRefreshToken);
  const result = await query(
    `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked,
            u.name, u.role, u.school_id, u.child_id
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1`,
    [hash]
  );

  if (!result.rows.length)           throw Object.assign(new Error('Invalid refresh token'),  { status: 401 });
  const row = result.rows[0];
  if (row.revoked)                   throw Object.assign(new Error('Refresh token revoked'),  { status: 401 });
  if (new Date(row.expires_at) < new Date()) throw Object.assign(new Error('Refresh token expired'), { status: 401 });

  // Rotate: revoke old, issue new
  await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1`, [row.id]);
  const newRefreshToken = await issueRefreshToken(row.user_id);

  const payload     = { userId: row.user_id, role: row.role, schoolId: row.school_id };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });

  return {
    token:        accessToken,
    refreshToken: newRefreshToken,
    user: { id: row.user_id, name: row.name, role: row.role, school_id: row.school_id, child_id: row.child_id },
  };
};

// ─── Firebase phone login (mobile) ───────────────────────────────────────────

const loginWithFirebaseToken = async (firebaseIdToken, fcmToken = null) => {
  const decoded     = await verifyIdToken(firebaseIdToken);
  const phoneNumber = decoded.phone_number;
  if (!phoneNumber) throw Object.assign(new Error('Phone number not found in Firebase token'), { status: 400 });
  return handleUserLogin({ phone: phoneNumber }, fcmToken);
};

// ─── Supabase OTP login (web — phone or email) ────────────────────────────────

const loginWithSupabaseToken = async (supabaseToken, fcmToken = null) => {
  const { data: { user }, error } = await supabase.auth.getUser(supabaseToken);
  if (error || !user) throw Object.assign(new Error('Invalid Supabase token'), { status: 401 });

  if (user.phone) return handleUserLogin({ phone: user.phone }, fcmToken);
  if (user.email) return handleUserLogin({ email: user.email }, fcmToken);

  throw Object.assign(new Error('No phone or email in Supabase user'), { status: 400 });
};

// ─── Admin credential login (username + bcrypt password) ─────────────────────
// Falls back to env var comparison when DB is unavailable or migration 007
// has not yet run (columns email / password_hash may not exist yet).

const loginWithCredentials = async (username, password) => {
  const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
  const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';

  // ── Try DB-backed login first (works after migration 007 runs) ──────────────
  try {
    const result = await query(
      `SELECT id, name, role, school_id, email, password_hash
       FROM users
       WHERE (email = $1 OR name = $1) AND role = 'admin'`,
      [username]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      if (user.password_hash) {
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) throw Object.assign(new Error('Invalid username or password'), { status: 401 });

        const payload      = { userId: user.id, role: user.role, schoolId: user.school_id };
        const token        = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });
        const refreshToken = await issueRefreshToken(user.id).catch(() => null);
        return { token, refreshToken, user: { id: user.id, name: user.name, role: user.role, school_id: user.school_id } };
      }
    }
    // Fall through to env-var check if DB has no admin row or no password_hash yet
  } catch (dbErr) {
    // DB unreachable or migration 007 not yet applied — use env var fallback
    console.warn('[Auth] DB credentials check failed, using env fallback:', dbErr.message);
  }

  // ── Env var fallback (always works, uses plaintext comparison) ──────────────
  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    throw Object.assign(new Error('Invalid username or password'), { status: 401 });
  }

  // Issue a JWT for the static admin demo user
  const adminUser = { id: '00000000-0000-0000-0000-000000000003', name: ADMIN_USER, role: 'admin', school_id: '00000000-0000-0000-0000-000000000001' };
  const payload   = { userId: adminUser.id, role: 'admin', schoolId: adminUser.school_id };
  const token     = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });
  return { token, refreshToken: null, user: adminUser };
};

// ─── Core login logic ─────────────────────────────────────────────────────────

const handleUserLogin = async ({ phone, email }, fcmToken) => {
  let userResult;

  if (phone) {
    userResult = await query(
      'SELECT id, name, role, school_id, child_id FROM users WHERE phone = $1',
      [phone]
    );
  } else {
    userResult = await query(
      'SELECT id, name, role, school_id, child_id FROM users WHERE email = $1',
      [email]
    );
  }

  let user;
  let isNewUser = false;

  if (userResult.rows.length === 0) {
    // New user — insert with only the field we have (phone OR email)
    const newId = uuidv4();
    const insertResult = await query(
      `INSERT INTO users (id, phone, email, role, created_at)
       VALUES ($1, $2, $3, 'student', NOW())
       RETURNING id, name, role, school_id, child_id`,
      [newId, phone || null, email || null]
    );
    user      = insertResult.rows[0];
    isNewUser = true;
  } else {
    user = userResult.rows[0];
  }

  // Update FCM token for push notifications
  if (fcmToken) {
    await query('UPDATE users SET fcm_token = $1 WHERE id = $2', [fcmToken, user.id]);
  }

  // Auto-wire parent↔child link if applicable
  if (user.role === 'parent' || isNewUser) {
    await resolveParentLink(user.id, phone, email).catch(() => {});
    const refreshed = await query(
      'SELECT id, name, role, school_id, child_id FROM users WHERE id = $1',
      [user.id]
    );
    if (refreshed.rows.length) user = refreshed.rows[0];
  }

  const payload      = { userId: user.id, role: user.role, schoolId: user.school_id };
  const token        = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
  const refreshToken = await issueRefreshToken(user.id).catch(() => null);

  await set(`session:${user.id}`, payload, 24 * 3600);

  return { token, refreshToken, user: { ...user }, isNewUser };
};

// ─── Logout ───────────────────────────────────────────────────────────────────

const logout = async (token, userId) => {
  await set(`blacklist:${token}`, true, 24 * 3600);
  await del(`session:${userId}`);
  await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`, [userId]).catch(() => {});
};

const loginWithEmailPassword = async (email, password) => {
  const result = await query(
    `SELECT id, name, role, school_id, child_id, password_hash FROM users WHERE email = $1`,
    [email]
  );
  if (!result.rows.length)
    throw Object.assign(new Error('No account found with this email'), { status: 401 });

  const user = result.rows[0];
  if (!user.password_hash)
    throw Object.assign(new Error('Password not set. Contact admin.'), { status: 401 });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid)
    throw Object.assign(new Error('Invalid email or password'), { status: 401 });

  const payload      = { userId: user.id, role: user.role, schoolId: user.school_id };
  const token        = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
  const refreshToken = await issueRefreshToken(user.id).catch(() => null);
  await set(`session:${user.id}`, payload, 24 * 3600);

  return { token, refreshToken, user: { id: user.id, name: user.name, role: user.role, school_id: user.school_id, child_id: user.child_id }, isNewUser: false };
};

const registerUser = async ({ name, email, password, role = 'teacher' }) => {
  if (!name || !email || !password)
    throw Object.assign(new Error('name, email and password are required'), { status: 400 });
  if (!['teacher', 'parent'].includes(role))
    throw Object.assign(new Error('role must be teacher or parent'), { status: 400 });

  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length)
    throw Object.assign(new Error('An account with this email already exists'), { status: 409 });

  const hash = await bcrypt.hash(password, 10);
  const id   = uuidv4();
  const ins  = await query(
    `INSERT INTO users (id, name, email, password_hash, role, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING id, name, role, school_id, child_id`,
    [id, name, email, hash, role]
  );

  const user         = ins.rows[0];
  const payload      = { userId: user.id, role: user.role, schoolId: user.school_id };
  const token        = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
  const refreshToken = await issueRefreshToken(user.id).catch(() => null);
  await set(`session:${user.id}`, payload, 24 * 3600);

  return { token, refreshToken, user: { id: user.id, name: user.name, role: user.role, school_id: user.school_id, child_id: user.child_id }, isNewUser: true };
};

module.exports = {
  loginWithFirebaseToken,
  loginWithSupabaseToken,
  loginWithCredentials,
  loginWithEmailPassword,
  registerUser,
  refreshAccessToken,
  logout,
};
