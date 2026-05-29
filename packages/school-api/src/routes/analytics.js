const router = require('express').Router();
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

// GET live dashboard metrics (Chalo Dashboard concept)
router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    const school_id = req.user.school_id;
    const today = new Date().toISOString().slice(0, 10);

    const [students, fees, staff, attendance] = await Promise.all([
      // Total students + new this term
      pool.query(`SELECT COUNT(*) AS total,
                  COUNT(*) FILTER (WHERE admission_date >= date_trunc('month', NOW())) AS new_this_term
                  FROM students WHERE school_id = $1 AND is_active = true`, [school_id]),

      // Fees collected vs outstanding
      pool.query(`SELECT COALESCE(SUM(paid_amount),0) AS collected,
                  COALESCE(SUM(outstanding),0) AS outstanding,
                  COALESCE(SUM(total_fee),0) AS total
                  FROM fee_outstanding WHERE school_id = $1`, [school_id]),

      // Staff present today
      pool.query(`SELECT COUNT(*) AS total_staff,
                  COUNT(*) FILTER (WHERE status = 'present') AS present
                  FROM staff_attendance sa
                  JOIN staff st ON st.id = sa.staff_id
                  WHERE st.school_id = $1 AND sa.date = $2`, [school_id, today]),

      // Class-wise attendance today
      pool.query(`SELECT c.name AS class_name,
                  COUNT(sa.id) AS total,
                  COUNT(sa.id) FILTER (WHERE sa.status = 'present') AS present,
                  ROUND(COUNT(sa.id) FILTER (WHERE sa.status = 'present')::numeric / NULLIF(COUNT(sa.id),0) * 100) AS pct
                  FROM classes c
                  LEFT JOIN student_attendance sa ON sa.class_id = c.id AND sa.date = $2
                  WHERE c.school_id = $1
                  GROUP BY c.id, c.name
                  ORDER BY c.name`, [school_id, today]),
    ]);

    const feeTotals = fees.rows[0];
    const collectionPct = feeTotals.total > 0
      ? Math.round((feeTotals.collected / feeTotals.total) * 100) : 0;

    res.json({
      students: {
        total: parseInt(students.rows[0].total),
        new_this_term: parseInt(students.rows[0].new_this_term),
      },
      fees: {
        collected: parseFloat(feeTotals.collected),
        outstanding: parseFloat(feeTotals.outstanding),
        collection_pct: collectionPct,
      },
      staff: {
        total: parseInt(staff.rows[0].total_staff || 0),
        present: parseInt(staff.rows[0].present || 0),
        attendance_pct: staff.rows[0].total_staff > 0
          ? Math.round((staff.rows[0].present / staff.rows[0].total_staff) * 100) : 0,
      },
      class_attendance: attendance.rows,
      as_of: today,
    });
  } catch (err) { next(err); }
});

module.exports = router;
