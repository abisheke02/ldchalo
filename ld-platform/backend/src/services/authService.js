const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { verifyIdToken } = require('../config/firebase');
const { set, del } = require('../config/redis');

const { supabase } = require('../config/supabase');
const { resolveParentLink } = require('./schoolService');

const ACCESS_TOKEN_TTL  = '24h';
const REFRESH_TOKEN_DAYS = 30;

// ─── Refresh Token Helpers ────────────────────────────────────────────────────

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const issueRefreshToken = async (userId) => {
  const rawToken = uuidv4();
  const hash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 3600 * 1000);

  await query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
     VALUES (uuid_generate_v4(), $1, $2, $3)`,
    [userId, hash, expiresAt]
  );

  return rawToken;
};

// ─── Public: refresh access token ────────────────────────────────────────────

const refreshAccessToken = async (rawRefreshToken) => {
  if (!rawRefreshToken) throw Object.assign(new Error('No refresh token'), { status: 401 });

  const hash = hashToken(rawRefreshToken);
  const result = await query(
    `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked,
            u.name, u.role, u.school_id, u.child_id
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1`,
    [hash]
  );

  if (!result.rows.length) throw Object.assign(new Error('Invalid refresh token'), { status: 401 });

  const row = result.rows[0];
  if (row.revoked) throw Object.assign(new Error('Refresh token revoked'), { status: 401 });
  if (new Date(row.expires_at) < new Date()) throw Object.assign(new Error('Refresh token expired'), { status: 401 });

  // Rotate: revoke old, issue new
  await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1`, [row.id]);
  const newRefreshToken = await issueRefreshToken(row.user_id);

  const payload = { userId: row.user_id, role: row.role, schoolId: row.school_id };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });

  const user = {
    id: row.user_id,
    name: row.name,
    role: row.role,
    school_id: row.school_id,
    child_id: row.child_id,
  };

  return { token: accessToken, refreshToken: newRefreshToken, user };
};

// ─── Firebase phone login (mobile) ───────────────────────────────────────────

const loginWithFirebaseToken = async (firebaseIdToken, fcmToken = null) => {
  const decoded = await verifyIdToken(firebaseIdToken);
  const phoneNumber = decoded.phone_number;
  if (!phoneNumber) throw Object.assign(new Error('Phone number not found in token'), { status: 400 });
  return await handleUserLogin({ phone: phoneNumber }, fcmToken);
};

// ─── Supabase OTP login (web) ────────────────────────────────────────────────

const loginWithSupabaseToken = async (supabaseToken, fcmToken = null) => {
  const { data: { user }, error } = await supabase.auth.getUser(supabaseToken);
  if (error || !user) throw Object.assign(new Error('Invalid Supabase token'), { status: 401 });

  // Supabase user may have phone or email depending on which OTP method was used
  if (user.phone) return await handleUserLogin({ phone: user.phone }, fcmToken);
  if (user.email) return await handleUserLogin({ email: user.email }, fcmToken);

  throw Object.assign(new Error('No phone or email found in Supabase user'), { status: 400 });
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
    const newId = uuidv4();
    const insertResult = await query(
      `INSERT INTO users (id, phone, email, role, created_at)
       VALUES ($1, $2, $3, 'student', NOW())
       RETURNING id, name, role, school_id, child_id`,
      [newId, phone || null, email || null]
    );
    user = insertResult.rows[0];
    isNewUser = true;
  } else {
    user = userResult.rows[0];
  }

  if (fcmToken) {
    await query('UPDATE users SET fcm_token = $1 WHERE id = $2', [fcmToken, user.id]);
  }

  // If a teacher linked this phone/email to a student, wire up child_id now
  if (user.role === 'parent' || isNewUser) {
    await resolveParentLink(user.id, phone, email).catch(() => {});
    // Re-fetch to pick up any child_id that was just set
    const refreshed = await query(
      'SELECT id, name, role, school_id, child_id FROM users WHERE id = $1', [user.id]
    );
    if (refreshed.rows.length) user = refreshed.rows[0];
  }

  const payload = { userId: user.id, role: user.role, schoolId: user.school_id };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });

  // Issue refresh token for real users
  const refreshToken = await issueRefreshToken(user.id).catch(() => null);

  // Cache session in Redis
  await set(`session:${user.id}`, payload, 24 * 3600);

  return { token, refreshToken, user: { ...user }, isNewUser };
};

// ─── Logout ───────────────────────────────────────────────────────────────────

const logout = async (token, userId) => {
  await set(`blacklist:${token}`, true, 24 * 3600);
  await del(`session:${userId}`);
  // Revoke all refresh tokens for this user
  await query(`UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`, [userId]).catch(() => {});
};

module.exports = {
  loginWithFirebaseToken,
  loginWithSupabaseToken,
  refreshAccessToken,
  logout,
};
