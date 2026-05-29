const router = require('express').Router();
const { pool } = require('../../config/database');
const { authenticate, authorize } = require('../../middleware/auth');

// POST bulk mark student attendance for a class
router.post('/mark', authenticate, authorize('teacher', 'school_admin'), async (req, res, next) => {
  try {
    const { class_id, date, attendance } = req.body; // [{student_id, status}]
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const a of attendance) {
        await client.query(
          `INSERT INTO student_attendance (school_id, class_id, student_id, date, status, marked_by)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (student_id, date, COALESCE(period_number,-1)) DO UPDATE SET status=EXCLUDED.status`,
          [req.user.school_id, class_id, a.student_id, date, a.status, req.user.sub]
        );
      }
      await client.query('COMMIT');
      // TODO: notify parents of absent students via WhatsApp/FCM
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
    res.json({ marked: attendance.length, date, class_id });
  } catch (err) { next(err); }
});

// GET class attendance for a date
router.get('/class/:class_id', authenticate, async (req, res, next) => {
  try {
    const { date } = req.query;
    const { rows } = await pool.query(
      `SELECT s.id, s.name, s.admission_number, s.roll_number,
              COALESCE(sa.status, 'not_marked') AS status
       FROM students s
       LEFT JOIN student_attendance sa ON sa.student_id = s.id AND sa.date = $2
       WHERE s.class_id = $1 AND s.is_active = true
       ORDER BY s.roll_number`,
      [req.params.class_id, date || new Date().toISOString().slice(0, 10)]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET student attendance report (monthly)
router.get('/student/:student_id/report', authenticate, async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const { rows } = await pool.query(
      `SELECT date, status FROM student_attendance
       WHERE student_id = $1
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR FROM date) = $3
       ORDER BY date`,
      [req.params.student_id, month, year]
    );
    const summary = rows.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});
    res.json({ month, year, records: rows, summary });
  } catch (err) { next(err); }
});

// GET class-wise attendance % today
router.get('/overview', authenticate, async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { rows } = await pool.query(
      `SELECT c.name, c.section,
              COUNT(s.id) AS total_students,
              COUNT(sa.id) FILTER (WHERE sa.status='present') AS present,
              ROUND(COUNT(sa.id) FILTER (WHERE sa.status='present')::numeric / NULLIF(COUNT(s.id),0) * 100) AS pct
       FROM classes c
       JOIN students s ON s.class_id = c.id AND s.is_active = true
       LEFT JOIN student_attendance sa ON sa.student_id = s.id AND sa.date = $2
       WHERE c.school_id = $1
       GROUP BY c.id, c.name, c.section
       ORDER BY c.name, c.section`,
      [req.user.school_id, today]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
