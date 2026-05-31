const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../../config/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

// Get my school info
router.get('/info', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM schools WHERE id = $1', [req.user.schoolId]);
    if (!rows.length) return res.status(404).json({ error: 'School not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// Register a new school
router.post('/register', async (req, res, next) => {
  try {
    const { name, location, adminName, adminEmail, adminPassword } = req.body;
    if (!name || !adminEmail || !adminPassword) return res.status(400).json({ error: 'name, adminEmail, adminPassword required' });

    const bcrypt = require('bcryptjs');
    const jwt    = require('jsonwebtoken');
    const env    = require('../../config/env');

    const joinCode   = Math.random().toString(36).slice(2, 8).toUpperCase();
    const schoolId   = uuid();
    const adminId    = uuid();
    const hash       = await bcrypt.hash(adminPassword, 10);

    await query('BEGIN');
    await query(
      `INSERT INTO schools (id, name, location, join_code) VALUES ($1,$2,$3,$4)`,
      [schoolId, name.trim(), location || null, joinCode]
    );
    await query(
      `INSERT INTO users (id, name, email, password_hash, role, school_id)
       VALUES ($1,$2,$3,$4,'school_admin',$5)`,
      [adminId, adminName || 'Admin', adminEmail.toLowerCase(), hash, schoolId]
    );
    await query('COMMIT');

    const token = jwt.sign({ id: adminId, role: 'school_admin', schoolId }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
    res.status(201).json({ token, school: { id: schoolId, name, joinCode } });
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    next(err);
  }
});

// Join school with join code (teacher)
router.post('/join', requireAuth, async (req, res, next) => {
  try {
    const { joinCode } = req.body;
    const { rows } = await query('SELECT id FROM schools WHERE join_code = $1', [joinCode?.toUpperCase()]);
    if (!rows.length) return res.status(404).json({ error: 'Invalid join code' });
    await query('UPDATE users SET school_id = $1 WHERE id = $2', [rows[0].id, req.user.id]);
    res.json({ schoolId: rows[0].id });
  } catch (err) { next(err); }
});

// List classes in school
router.get('/classes', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT c.*, u.name AS teacher_name,
              COUNT(cs.student_id)::int AS student_count
       FROM classes c
       LEFT JOIN users u ON u.id = c.teacher_id
       LEFT JOIN class_students cs ON cs.class_id = c.id
       WHERE c.school_id = $1
       GROUP BY c.id, u.name
       ORDER BY c.name`,
      [req.user.schoolId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Create class
router.post('/classes', requireAuth, requireRole('teacher', 'school_admin'), async (req, res, next) => {
  try {
    const { name, grade, section } = req.body;
    const { rows } = await query(
      `INSERT INTO classes (id, school_id, teacher_id, name, grade, section)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [uuid(), req.user.schoolId, req.user.id, name, grade || null, section || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// Get class students
router.get('/classes/:classId/students', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.phone, s.class_grade, s.ld_type, s.ld_risk_score, s.current_level
       FROM class_students cs
       JOIN users u ON u.id = cs.student_id
       LEFT JOIN students s ON s.user_id = cs.student_id
       WHERE cs.class_id = $1
       ORDER BY u.name`,
      [req.params.classId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
