const jwt    = require('jsonwebtoken');
const redis  = require('../config/redis');
const env    = require('../config/env');

const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });

  const token = header.slice(7);
  try {
    // Check blacklist
    try {
      const revoked = await redis.get(`bl:${token}`);
      if (revoked) return res.status(401).json({ error: 'Token revoked' });
    } catch { /* Redis down — skip blacklist check */ }

    const payload = jwt.verify(token, env.jwt.secret);
    req.user  = payload;
    req.token = token;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

module.exports = { requireAuth, requireRole };
