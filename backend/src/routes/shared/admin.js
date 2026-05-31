const router = require('express').Router();
const { query } = require('../../config/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

const isAdmin = [requireAuth, requireRole('super_admin', 'school_admin')];

// Platform overview
router.get('/overview', ...isAdmin, async (req, res, next) => {
  try {
    const [schools, users, sessions] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM schools'),
      query('SELECT role, COUNT(*)::int AS count FROM users GROUP BY role'),
      query('SELECT COUNT(*)::int AS count FROM practice_sessions WHERE created_at > NOW() - INTERVAL \'7 days\''),
    ]);
    res.json({
      schools:  schools.rows[0].count,
      users:    users.rows,
      sessions_7d: sessions.rows[0].count,
    });
  } catch (err) { next(err); }
});

// List schools
router.get('/schools', ...isAdmin, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT s.*, COUNT(DISTINCT u.id)::int AS user_count
       FROM schools s
       LEFT JOIN users u ON u.school_id = s.id
       GROUP BY s.id ORDER BY s.created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Trigger cron job manually
router.post('/cron/trigger/:job', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  try {
    const jobs = require('../../jobs/cronJobs');
    const fn   = jobs[req.params.job];
    if (!fn) return res.status(404).json({ error: `Unknown job: ${req.params.job}` });
    await fn();
    res.json({ ok: true, job: req.params.job });
  } catch (err) { next(err); }
});

// User management
router.get('/users', ...isAdmin, async (req, res, next) => {
  try {
    const { role, school_id, limit = 50, offset = 0 } = req.query;
    const filters = [];
    const vals    = [];
    if (role) { filters.push(`role = $${vals.push(role)}`); }
    if (school_id) { filters.push(`school_id = $${vals.push(school_id)}`); }
    const where = filters.length ? 'WHERE ' + filters.join(' AND ') : '';
    const { rows } = await query(
      `SELECT id, name, email, phone, role, school_id, created_at FROM users
       ${where} ORDER BY created_at DESC LIMIT $${vals.push(+limit)} OFFSET $${vals.push(+offset)}`,
      vals
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
