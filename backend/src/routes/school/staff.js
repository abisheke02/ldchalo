const router = require('express').Router();
const { v4: uuid } = require('uuid');
const bcrypt = require('bcryptjs');
const { query } = require('../../config/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

const admin = [requireAuth, requireRole('school_admin', 'super_admin')];

// List staff
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT s.*, u.name, u.email, u.phone, d.name AS department_name
       FROM staff s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN departments d ON d.id = s.department_id
       WHERE s.school_id = $1
       ORDER BY u.name`,
      [req.user.schoolId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Add staff member
router.post('/', ...admin, async (req, res, next) => {
  try {
    const { name, email, phone, role = 'teacher', departmentId, designation, salary } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'name and email required' });

    const tempPw = Math.random().toString(36).slice(2, 10);
    const hash   = await bcrypt.hash(tempPw, 10);
    const userId = uuid();
    const staffId = uuid();

    await query('BEGIN');
    await query(
      `INSERT INTO users (id, name, email, phone, password_hash, role, school_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (email) DO NOTHING`,
      [userId, name, email.toLowerCase(), phone || null, hash, role, req.user.schoolId]
    );
    await query(
      `INSERT INTO staff (id, user_id, school_id, department_id, designation, salary)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [staffId, userId, req.user.schoolId, departmentId || null, designation || null, salary || null]
    );
    await query('COMMIT');
    res.status(201).json({ ok: true, staffId, tempPassword: tempPw });
  } catch (err) {
    await query('ROLLBACK').catch(() => {});
    next(err);
  }
});

// Staff attendance today
router.get('/attendance/today', requireAuth, async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { rows } = await query(
      `SELECT sa.staff_id, u.name, sa.status, sa.check_in, sa.check_out
       FROM staff_attendance sa
       JOIN staff s ON s.id = sa.staff_id
       JOIN users u ON u.id = s.user_id
       WHERE s.school_id = $1 AND sa.date = $2
       ORDER BY u.name`,
      [req.user.schoolId, today]
    );
    res.json({ date: today, records: rows });
  } catch (err) { next(err); }
});

// Mark staff attendance
router.post('/attendance', ...admin, async (req, res, next) => {
  try {
    const { staff_id, status, date = new Date().toISOString().slice(0, 10), check_in, check_out } = req.body;
    await query(
      `INSERT INTO staff_attendance (staff_id, date, status, check_in, check_out)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (staff_id, date) DO UPDATE SET status=$3, check_in=$4, check_out=$5`,
      [staff_id, date, status, check_in || null, check_out || null]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
