const router = require('express').Router();
const { query } = require('../../config/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

const staff = [requireAuth, requireRole('teacher', 'school_admin')];

// Get attendance for a class on a date
router.get('/class/:classId', requireAuth, async (req, res, next) => {
  try {
    const { date = new Date().toISOString().slice(0, 10) } = req.query;
    const { rows } = await query(
      `SELECT u.id, u.name, sa.status, sa.date
       FROM class_students cs
       JOIN users u ON u.id = cs.student_id
       LEFT JOIN student_attendance sa ON sa.student_id = cs.student_id AND sa.date = $2
       WHERE cs.class_id = $1
       ORDER BY u.name`,
      [req.params.classId, date]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Mark/bulk update attendance
router.post('/mark', ...staff, async (req, res, next) => {
  try {
    const { class_id, date, attendance } = req.body;
    if (!class_id || !date || !Array.isArray(attendance)) {
      return res.status(400).json({ error: 'class_id, date, attendance[] required' });
    }
    for (const { student_id, status } of attendance) {
      await query(
        `INSERT INTO student_attendance (student_id, class_id, date, status, marked_by)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (student_id, date) DO UPDATE SET status=$4, marked_by=$5`,
        [student_id, class_id, date, status, req.user.id]
      );
    }
    res.json({ ok: true, count: attendance.length });
  } catch (err) { next(err); }
});

// Attendance overview (school-wide)
router.get('/overview', ...staff, async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { rows } = await query(
      `SELECT status, COUNT(*)::int AS count
       FROM student_attendance
       WHERE date = $1 AND student_id IN
             (SELECT id FROM users WHERE school_id = $2)
       GROUP BY status`,
      [today, req.user.schoolId]
    );
    res.json({ date: today, summary: rows });
  } catch (err) { next(err); }
});

// Student attendance report
router.get('/student/:studentId/report', requireAuth, async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const { rows } = await query(
      `SELECT date, status FROM student_attendance
       WHERE student_id = $1
         AND EXTRACT(MONTH FROM date) = $2
         AND EXTRACT(YEAR  FROM date) = $3
       ORDER BY date`,
      [req.params.studentId, month || new Date().getMonth() + 1, year || new Date().getFullYear()]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
