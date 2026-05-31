const router = require('express').Router();
const { query } = require('../../config/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

// School dashboard stats (for school mobile / school ERP dashboard)
router.get('/dashboard', requireAuth, requireRole('teacher', 'school_admin', 'super_admin'), async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const today    = new Date().toISOString().slice(0, 10);

    const [students, present, fees] = await Promise.all([
      query('SELECT COUNT(*)::int AS total FROM users WHERE school_id = $1 AND role = $2', [schoolId, 'student']),
      query(
        `SELECT COUNT(*)::int AS present FROM student_attendance
         WHERE date = $1 AND status = 'present' AND
               student_id IN (SELECT id FROM users WHERE school_id = $2)`,
        [today, schoolId]
      ),
      query(
        `SELECT COALESCE(SUM(amount),0)::numeric AS collected
         FROM fee_transactions WHERE school_id = $1 AND DATE(created_at) = $2`,
        [schoolId, today]
      ),
    ]);

    res.json({
      as_of:      today,
      students:   students.rows[0].total,
      attendance: { present: present.rows[0].present },
      fees:       { collected_today: fees.rows[0].collected },
    });
  } catch (err) { next(err); }
});

// Student personal analytics
router.get('/student/me', requireAuth, async (req, res, next) => {
  try {
    const uid = req.user.id;

    const [profile, trend, errors, sessions] = await Promise.all([
      query(`SELECT streak_count, current_level FROM students WHERE user_id = $1`, [uid]),
      query(
        `SELECT DATE(created_at) AS day, ROUND(AVG(score),1) AS avg_score
         FROM test_attempts WHERE user_id = $1 AND created_at > NOW() - INTERVAL '14 days'
         GROUP BY day ORDER BY day`,
        [uid]
      ),
      query(
        `SELECT error_type, COUNT(*)::int AS count
         FROM student_errors WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
         GROUP BY error_type ORDER BY count DESC LIMIT 5`,
        [uid]
      ),
      query(
        `SELECT COALESCE(SUM(duration_minutes),0)::int AS total_minutes_today
         FROM practice_sessions WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE`,
        [uid]
      ),
    ]);

    res.json({
      profile:   { ...(profile.rows[0] || {}), total_minutes_today: sessions.rows[0]?.total_minutes_today || 0 },
      trend:     trend.rows,
      weakAreas: errors.rows,
    });
  } catch (err) { next(err); }
});

module.exports = router;
