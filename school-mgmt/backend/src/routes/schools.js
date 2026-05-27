const router = require('express').Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET school profile
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM schools WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'School not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST create school (super admin)
router.post('/', authenticate, authorize('super_admin'), async (req, res, next) => {
  try {
    const { name, code, address, city, state, phone, email, board_type, affiliation_no } = req.body;
    const { rows: [school] } = await pool.query(
      `INSERT INTO schools (name, code, address, city, state, phone, email, board_type, affiliation_no)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, code, address, city, state, phone, email, board_type || 'CBSE', affiliation_no]
    );
    res.status(201).json(school);
  } catch (err) { next(err); }
});

// GET all classes for a school
router.get('/:id/classes', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, u.name AS class_teacher_name,
              COUNT(cs.student_id) AS student_count
       FROM classes c
       LEFT JOIN users u ON u.id = c.class_teacher_id
       LEFT JOIN class_students cs ON cs.class_id = c.id
       WHERE c.school_id = $1
       GROUP BY c.id, u.name
       ORDER BY c.name, c.section`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST create class
router.post('/:id/classes', authenticate, authorize('school_admin', 'principal'), async (req, res, next) => {
  try {
    const { name, section, class_teacher_id, max_students, academic_year_id } = req.body;
    const { rows: [cls] } = await pool.query(
      `INSERT INTO classes (school_id, academic_year_id, name, section, class_teacher_id, max_students)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, academic_year_id, name, section, class_teacher_id, max_students || 40]
    );
    res.status(201).json(cls);
  } catch (err) { next(err); }
});

module.exports = router;
