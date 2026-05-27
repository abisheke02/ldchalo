const jwt = require('jsonwebtoken');
const { getRedis } = require('../config/redis');

async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const redis = getRedis();
  if (redis) {
    const blacklisted = await redis.get(`blacklist:${token}`);
    if (blacklisted) return res.status(401).json({ error: 'Token revoked' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_change_me');
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
