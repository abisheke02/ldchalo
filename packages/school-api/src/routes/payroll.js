const router = require('express').Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET salary structure for a staff member
router.get('/structure/:staff_id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM salary_structures WHERE staff_id=$1 ORDER BY effective_from DESC LIMIT 1`,
      [req.params.staff_id]
    );
    res.json(rows[0] || null);
  } catch (err) { next(err); }
});

// POST set salary structure
router.post('/structure', authenticate, authorize('school_admin'), async (req, res, next) => {
  try {
    const { staff_id, basic_salary, hra, da, transport_allowance, other_allowance, pf_deduction, esi_deduction, tds_deduction, effective_from } = req.body;
    const { rows: [s] } = await pool.query(
      `INSERT INTO salary_structures (school_id, staff_id, basic_salary, hra, da, transport_allowance, other_allowance, pf_deduction, esi_deduction, tds_deduction, effective_from)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.user.school_id, staff_id, basic_salary, hra, da, transport_allowance, other_allowance, pf_deduction, esi_deduction, tds_deduction, effective_from]
    );
    res.status(201).json(s);
  } catch (err) { next(err); }
});

// POST generate monthly payroll
router.post('/run', authenticate, authorize('school_admin'), async (req, res, next) => {
  try {
    const { month, year } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [run] } = await client.query(
        `INSERT INTO payroll_runs (school_id, month, year, generated_by)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (school_id, month, year) DO UPDATE SET status='draft' RETURNING *`,
        [req.user.school_id, month, year, req.user.sub]
      );

      // Get all active staff with salary structures
      const { rows: staff } = await client.query(
        `SELECT st.id AS staff_id, ss.*
         FROM staff st
         JOIN salary_structures ss ON ss.staff_id = st.id
         WHERE st.school_id = $1 AND st.is_active = true
           AND ss.effective_from = (SELECT MAX(effective_from) FROM salary_structures WHERE staff_id = st.id)`,
        [req.user.school_id]
      );

      let total_gross = 0, total_net = 0;
      for (const s of staff) {
        const gross = parseFloat(s.basic_salary) + parseFloat(s.hra) + parseFloat(s.da) + parseFloat(s.transport_allowance) + parseFloat(s.other_allowance);
        const deductions = parseFloat(s.pf_deduction) + parseFloat(s.esi_deduction) + parseFloat(s.tds_deduction);
        const net = gross - deductions;
        total_gross += gross; total_net += net;
        await client.query(
          `INSERT INTO payslips (payroll_run_id, staff_id, gross_salary, total_deductions, net_salary)
           VALUES ($1,$2,$3,$4,$5) ON CONFLICT (payroll_run_id, staff_id) DO NOTHING`,
          [run.id, s.staff_id, gross, deductions, net]
        );
      }

      await client.query(
        `UPDATE payroll_runs SET total_gross=$1, total_net=$2 WHERE id=$3`,
        [total_gross, total_net, run.id]
      );
      await client.query('COMMIT');
      res.status(201).json({ run_id: run.id, month, year, staff_count: staff.length, total_gross, total_net });
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
  } catch (err) { next(err); }
});

module.exports = router;
