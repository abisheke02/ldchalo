const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../../config/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

const staff = [requireAuth, requireRole('teacher', 'school_admin')];

// Outstanding fees list
router.get('/outstanding', ...staff, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT u.id AS student_id, u.name, u.phone,
              fo.total_due, fo.total_paid, fo.balance
       FROM fee_outstanding fo
       JOIN users u ON u.id = fo.student_id
       WHERE fo.school_id = $1 AND fo.balance > 0
       ORDER BY fo.balance DESC LIMIT 100`,
      [req.user.schoolId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Collect fee at counter
router.post('/collect/counter', ...staff, async (req, res, next) => {
  try {
    const { student_id, amount, payment_mode = 'cash', note } = req.body;
    if (!student_id || !amount) return res.status(400).json({ error: 'student_id and amount required' });

    const receiptNo = `RCP-${Date.now()}`;
    const { rows } = await query(
      `INSERT INTO fee_transactions
         (id, school_id, student_id, amount, payment_mode, receipt_no, collected_by, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [uuid(), req.user.schoolId, student_id, amount, payment_mode, receiptNo, req.user.id, note || null]
    );
    res.status(201).json({ receipt: rows[0] });
  } catch (err) { next(err); }
});

// Fee concessions
router.get('/concessions', ...staff, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT fc.*, u.name AS student_name, cc.name AS category_name
       FROM fee_concessions fc
       JOIN users u ON u.id = fc.student_id
       LEFT JOIN concession_categories cc ON cc.id = fc.category_id
       WHERE fc.school_id = $1
       ORDER BY fc.created_at DESC LIMIT 100`,
      [req.user.schoolId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Fee structures
router.get('/structures', ...staff, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM fee_structures WHERE school_id = $1 ORDER BY grade, name',
      [req.user.schoolId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Receipt history for student
router.get('/receipts/:studentId', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM fee_transactions WHERE student_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.params.studentId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
