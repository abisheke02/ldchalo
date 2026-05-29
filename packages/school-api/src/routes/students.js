const router = require('express').Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { class_id, search } = req.query;
    let query = `SELECT s.*, c.name AS class_name, c.section
                 FROM students s LEFT JOIN classes c ON c.id = s.class_id
                 WHERE s.school_id = $1 AND s.is_active = true`;
    const params = [req.user.school_id];
    if (class_id) { params.push(class_id); query += ` AND s.class_id = $${params.length}`; }
    if (search) { params.push(`%${search}%`); query += ` AND (s.name ILIKE $${params.length} OR s.admission_number ILIKE $${params.length})`; }
    query += ' ORDER BY s.name';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, c.name AS class_name, c.section, p.father_name, p.mother_name, p.father_phone, p.mother_phone
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN parents p ON p.id = s.parent_id
       WHERE s.id = $1 AND s.school_id = $2`,
      [req.params.id, req.user.school_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Student not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.post('/', authenticate, authorize('school_admin', 'principal'), async (req, res, next) => {
  try {
    const { name, date_of_birth, gender, blood_group, class_id, admission_type, category, parent } = req.body;
    const admissionNumber = `ADM-${Date.now()}`;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Create user
      const { rows: [user] } = await client.query(
        `INSERT INTO users (school_id, name, role) VALUES ($1, $2, 'student') RETURNING id`,
        [req.user.school_id, name]
      );
      // Create parent if provided
      let parent_id = null;
      if (parent) {
        const { rows: [p] } = await client.query(
          `INSERT INTO parents (school_id, father_name, mother_name, father_phone, mother_phone)
           VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [req.user.school_id, parent.father_name, parent.mother_name, parent.father_phone, parent.mother_phone]
        );
        parent_id = p.id;
      }
      const { rows: [student] } = await client.query(
        `INSERT INTO students (user_id, school_id, parent_id, admission_number, class_id, name, date_of_birth, gender, blood_group, admission_type, category)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [user.id, req.user.school_id, parent_id, admissionNumber, class_id, name, date_of_birth, gender, blood_group, admission_type || 'general', category]
      );
      await client.query('COMMIT');
      res.status(201).json(student);
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, authorize('school_admin', 'principal'), async (req, res, next) => {
  try {
    const { name, class_id, blood_group, height_cm, weight_kg } = req.body;
    const { rows: [s] } = await pool.query(
      `UPDATE students SET name=COALESCE($1,name), class_id=COALESCE($2,class_id),
       blood_group=COALESCE($3,blood_group), height_cm=COALESCE($4,height_cm), weight_kg=COALESCE($5,weight_kg),
       updated_at=NOW() WHERE id=$6 AND school_id=$7 RETURNING *`,
      [name, class_id, blood_group, height_cm, weight_kg, req.params.id, req.user.school_id]
    );
    res.json(s);
  } catch (err) { next(err); }
});

module.exports = router;
