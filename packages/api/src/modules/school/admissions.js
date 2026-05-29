const router = require('express').Router();
const { pool } = require('../../config/database');
const { authenticate, authorize } = require('../../middleware/auth');

// GET all enquiries with funnel status
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, academic_year_id } = req.query;
    let q = `SELECT * FROM admission_enquiries WHERE school_id = $1`;
    const params = [req.user.school_id];
    if (status) { params.push(status); q += ` AND status = $${params.length}`; }
    if (academic_year_id) { params.push(academic_year_id); q += ` AND academic_year_id = $${params.length}`; }
    q += ' ORDER BY enquiry_date DESC';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// GET funnel summary
router.get('/funnel', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT status, COUNT(*) AS count
       FROM admission_enquiries WHERE school_id = $1
       GROUP BY status`,
      [req.user.school_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST new enquiry (online admission form)
router.post('/', async (req, res, next) => {
  try {
    const { school_id, student_name, date_of_birth, applying_for_class, parent_name, parent_phone, parent_email, address, source, quota } = req.body;
    const { rows: [enq] } = await pool.query(
      `INSERT INTO admission_enquiries (school_id, student_name, date_of_birth, applying_for_class, parent_name, parent_phone, parent_email, address, source, quota)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [school_id, student_name, date_of_birth, applying_for_class, parent_name, parent_phone, parent_email, address, source || 'online', quota]
    );
    res.status(201).json(enq);
  } catch (err) { next(err); }
});

// PATCH advance status in funnel
router.patch('/:id/status', authenticate, authorize('school_admin', 'principal'), async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const { rows: [enq] } = await pool.query(
      `UPDATE admission_enquiries SET status=$1, notes=COALESCE($2,notes), updated_at=NOW()
       WHERE id=$3 AND school_id=$4 RETURNING *`,
      [status, notes, req.params.id, req.user.school_id]
    );
    res.json(enq);
  } catch (err) { next(err); }
});

module.exports = router;
