const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../../config/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

const staff = [requireAuth, requireRole('teacher', 'school_admin')];

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM exams WHERE school_id=$1 ORDER BY start_date DESC LIMIT 50',
      [req.user.schoolId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', ...staff, async (req, res, next) => {
  try {
    const { name, exam_type, start_date, end_date } = req.body;
    const { rows } = await query(
      `INSERT INTO exams (id, school_id, name, exam_type, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [uuid(), req.user.schoolId, name, exam_type || 'unit_test', start_date, end_date || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.get('/:examId/marks', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT m.*, u.name AS student_name, sub.name AS subject_name
       FROM marks m
       JOIN users u ON u.id = m.student_id
       JOIN subjects sub ON sub.id = m.subject_id
       WHERE m.exam_id = $1
       ORDER BY u.name`,
      [req.params.examId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/:examId/marks', ...staff, async (req, res, next) => {
  try {
    const { marks } = req.body;
    for (const { student_id, subject_id, marks_obtained, max_marks } of marks) {
      await query(
        `INSERT INTO marks (id, exam_id, student_id, subject_id, marks_obtained, max_marks)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (exam_id, student_id, subject_id)
         DO UPDATE SET marks_obtained=$5, max_marks=$6`,
        [uuid(), req.params.examId, student_id, subject_id, marks_obtained, max_marks || 100]
      );
    }
    res.json({ ok: true, count: marks.length });
  } catch (err) { next(err); }
});

module.exports = router;
