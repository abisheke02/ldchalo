const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../../config/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

// My profile (student)
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.role,
              s.class_grade, s.ld_type, s.ld_risk_score, s.current_level,
              s.streak_count, s.last_screened_at
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ profile: rows[0] });
  } catch (err) { next(err); }
});

// Setup student profile after first login
router.post('/profile', requireAuth, async (req, res, next) => {
  try {
    const { name, age, classGrade } = req.body;
    if (name) await query('UPDATE users SET name = $1 WHERE id = $2', [name, req.user.id]);

    const existing = await query('SELECT 1 FROM students WHERE user_id = $1', [req.user.id]);
    if (existing.rows.length) {
      await query(
        'UPDATE students SET age = $1, class_grade = $2 WHERE user_id = $3',
        [age || null, classGrade || null, req.user.id]
      );
    } else {
      await query(
        `INSERT INTO students (user_id, age, class_grade)
         VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING`,
        [req.user.id, age || null, classGrade || null]
      );
    }
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Join school (student uses join code)
router.post('/join-school', requireAuth, async (req, res, next) => {
  try {
    const { joinCode } = req.body;
    const { rows } = await query('SELECT id FROM schools WHERE join_code = $1', [joinCode?.toUpperCase()]);
    if (!rows.length) return res.status(404).json({ error: 'Invalid school code' });
    await query('UPDATE users SET school_id = $1 WHERE id = $2', [rows[0].id, req.user.id]);
    res.json({ schoolId: rows[0].id });
  } catch (err) { next(err); }
});

// Teacher: list at-risk students
router.get('/at-risk', requireAuth, requireRole('teacher', 'school_admin'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.name, s.ld_type, s.ld_risk_score, s.current_level, s.class_grade
       FROM students s JOIN users u ON u.id = s.user_id
       WHERE u.school_id = $1 AND s.ld_risk_score >= 50
       ORDER BY s.ld_risk_score DESC LIMIT 20`,
      [req.user.schoolId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Teacher: invite student by email
router.post('/invite', requireAuth, requireRole('teacher', 'school_admin'), async (req, res, next) => {
  try {
    const { email, classId } = req.body;
    // Check if already exists
    let student = (await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])).rows[0];
    if (!student) {
      const bcrypt = require('bcryptjs');
      const tempPw = Math.random().toString(36).slice(2, 10);
      const hash   = await bcrypt.hash(tempPw, 10);
      student = (await query(
        `INSERT INTO users (id, email, password_hash, role, school_id)
         VALUES ($1,$2,$3,'student',$4) RETURNING id`,
        [uuid(), email.toLowerCase(), hash, req.user.schoolId]
      )).rows[0];
    }
    if (classId) {
      await query(
        'INSERT INTO class_students (class_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [classId, student.id]
      );
    }
    res.json({ ok: true, studentId: student.id });
  } catch (err) { next(err); }
});

module.exports = router;
