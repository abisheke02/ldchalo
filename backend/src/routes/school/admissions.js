const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../../config/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

const staff = [requireAuth, requireRole('teacher', 'school_admin')];

router.get('/', ...staff, async (req, res, next) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    const vals = [req.user.schoolId, +limit, +offset];
    const where = status ? `AND ae.status = $${vals.push(status)}` : '';
    const { rows } = await query(
      `SELECT ae.*, u.name AS assigned_to_name
       FROM admission_enquiries ae
       LEFT JOIN users u ON u.id = ae.assigned_to
       WHERE ae.school_id = $1 ${where}
       ORDER BY ae.created_at DESC LIMIT $2 OFFSET $3`,
      vals
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { school_id, student_name, parent_name, parent_phone, grade, source = 'walk_in' } = req.body;
    const { rows } = await query(
      `INSERT INTO admission_enquiries
         (id, school_id, student_name, parent_name, parent_phone, grade, source, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'new') RETURNING *`,
      [uuid(), school_id, student_name, parent_name, parent_phone || null, grade || null, source]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.patch('/:id/status', ...staff, async (req, res, next) => {
  try {
    const { status, note } = req.body;
    await query(
      'UPDATE admission_enquiries SET status=$1, note=$2, updated_at=NOW() WHERE id=$3 AND school_id=$4',
      [status, note || null, req.params.id, req.user.schoolId]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.get('/funnel', ...staff, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT status, COUNT(*)::int AS count FROM admission_enquiries WHERE school_id=$1 GROUP BY status',
      [req.user.schoolId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
