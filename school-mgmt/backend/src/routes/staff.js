const router = require('express').Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET all staff
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { staff_type } = req.query;
    let q = `SELECT st.*, u.name, u.phone, u.email, d.name AS department
             FROM staff st JOIN users u ON u.id = st.user_id
             LEFT JOIN departments d ON d.id = st.department_id
             WHERE st.school_id = $1 AND st.is_active = true`;
    const params = [req.user.school_id];
    if (staff_type) { params.push(staff_type); q += ` AND st.staff_type = $${params.length}`; }
    q += ' ORDER BY u.name';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST create staff
router.post('/', authenticate, authorize('school_admin', 'principal'), async (req, res, next) => {
  try {
    const { name, phone, email, staff_type, department_id, date_of_joining, employee_code } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [user] } = await client.query(
        `INSERT INTO users (school_id, name, phone, email, role) VALUES ($1,$2,$3,$4,'teacher') RETURNING id`,
        [req.user.school_id, name, phone, email]
      );
      const { rows: [staff] } = await client.query(
        `INSERT INTO staff (user_id, school_id, staff_type, department_id, date_of_joining, employee_code)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [user.id, req.user.school_id, staff_type, department_id, date_of_joining, employee_code]
      );
      await client.query('COMMIT');
      res.status(201).json({ ...staff, name, phone, email });
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
  } catch (err) { next(err); }
});

// POST mark staff attendance (bulk)
router.post('/attendance', authenticate, authorize('school_admin', 'principal'), async (req, res, next) => {
  try {
    const { date, attendance } = req.body; // [{ staff_id, status, check_in, remarks }]
    const values = attendance.map(a =>
      `('${a.staff_id}', '${date}', '${a.status}', ${a.check_in ? `'${a.check_in}'` : 'NULL'}, ${a.remarks ? `'${a.remarks}'` : 'NULL'}, '${req.user.sub}')`
    ).join(',');
    await pool.query(
      `INSERT INTO staff_attendance (staff_id, date, status, check_in, remarks, marked_by)
       VALUES ${values}
       ON CONFLICT (staff_id, date) DO UPDATE SET status=EXCLUDED.status, check_in=EXCLUDED.check_in`
    );
    res.json({ marked: attendance.length, date });
  } catch (err) { next(err); }
});

// GET staff attendance summary for today
router.get('/attendance/today', authenticate, async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { rows } = await pool.query(
      `SELECT st.staff_type,
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE sa.status='absent') AS absent,
              COUNT(*) FILTER (WHERE sa.status='half_day') AS half_day,
              COUNT(*) FILTER (WHERE sa.status='on_duty') AS on_duty,
              COUNT(*) FILTER (WHERE sa.status='late') AS late,
              COUNT(*) FILTER (WHERE sa.status='leave') AS leave
       FROM staff st
       LEFT JOIN staff_attendance sa ON sa.staff_id = st.id AND sa.date = $2
       WHERE st.school_id = $1
       GROUP BY st.staff_type`,
      [req.user.school_id, today]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
