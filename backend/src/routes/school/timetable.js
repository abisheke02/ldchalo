const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../../config/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

router.get('/:classId', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT ts.*, sub.name AS subject_name, u.name AS teacher_name
       FROM timetable_slots ts
       LEFT JOIN subjects sub ON sub.id = ts.subject_id
       LEFT JOIN users u ON u.id = ts.teacher_id
       WHERE ts.class_id = $1
       ORDER BY ts.day_of_week, ts.period_number`,
      [req.params.classId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/slots', requireAuth, requireRole('school_admin'), async (req, res, next) => {
  try {
    const { class_id, day_of_week, period_number, subject_id, teacher_id, start_time, end_time } = req.body;
    const { rows } = await query(
      `INSERT INTO timetable_slots
         (id, class_id, day_of_week, period_number, subject_id, teacher_id, start_time, end_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (class_id, day_of_week, period_number)
       DO UPDATE SET subject_id=$5, teacher_id=$6, start_time=$7, end_time=$8
       RETURNING *`,
      [uuid(), class_id, day_of_week, period_number, subject_id || null, teacher_id || null, start_time || null, end_time || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.post('/generate', requireAuth, requireRole('school_admin'), async (req, res, next) => {
  try {
    res.json({ message: 'AI timetable generation queued', status: 'pending' });
  } catch (err) { next(err); }
});

module.exports = router;
