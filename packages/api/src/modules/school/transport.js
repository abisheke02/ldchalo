const router = require('express').Router();
const { pool } = require('../../config/database');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/routes', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, COUNT(st.student_id) AS student_count
       FROM routes r LEFT JOIN student_transport st ON st.route_id = r.id
       WHERE r.school_id=$1 GROUP BY r.id ORDER BY r.name`,
      [req.user.school_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/routes/:id/stops', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM stops WHERE route_id=$1 ORDER BY order_no`, [req.params.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/routes', authenticate, authorize('school_admin'), async (req, res, next) => {
  try {
    const { name, description, stops } = req.body;
    const { rows: [route] } = await pool.query(
      `INSERT INTO routes (school_id, name, description) VALUES ($1,$2,$3) RETURNING *`,
      [req.user.school_id, name, description]
    );
    if (stops?.length) {
      for (let i = 0; i < stops.length; i++) {
        await pool.query(
          `INSERT INTO stops (route_id, name, pickup_time, drop_time, order_no) VALUES ($1,$2,$3,$4,$5)`,
          [route.id, stops[i].name, stops[i].pickup_time, stops[i].drop_time, i + 1]
        );
      }
    }
    res.status(201).json(route);
  } catch (err) { next(err); }
});

router.post('/assign', authenticate, authorize('school_admin'), async (req, res, next) => {
  try {
    const { student_id, route_id, stop_id, vehicle_id, academic_year_id, monthly_fee } = req.body;
    const { rows: [assignment] } = await pool.query(
      `INSERT INTO student_transport (student_id, route_id, stop_id, vehicle_id, academic_year_id, monthly_fee)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (student_id, academic_year_id) DO UPDATE
       SET route_id=$2, stop_id=$3, vehicle_id=$4, monthly_fee=$6 RETURNING *`,
      [student_id, route_id, stop_id, vehicle_id, academic_year_id, monthly_fee]
    );
    res.status(201).json(assignment);
  } catch (err) { next(err); }
});

module.exports = router;
