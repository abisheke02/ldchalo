const router = require('express').Router();
const { pool } = require('../../config/database');
const { authenticate, authorize } = require('../../middleware/auth');

// GET fee structure for a class + term
router.get('/structure', authenticate, async (req, res, next) => {
  try {
    const { class_id, term_id } = req.query;
    const { rows } = await pool.query(
      `SELECT fs.*, fh.name AS fee_head_name
       FROM fee_structures fs
       JOIN fee_heads fh ON fh.id = fs.fee_head_id
       WHERE fs.class_id = $1 AND fs.term_id = $2`,
      [class_id, term_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET class-wise outstanding report
router.get('/outstanding', authenticate, async (req, res, next) => {
  try {
    const { class_id, term_id } = req.query;
    const { rows } = await pool.query(
      `SELECT s.admission_number, s.name AS student_name, c.name AS class_name,
              SUM(fo.total_fee) AS total_fees,
              SUM(fo.paid_amount) AS receipts,
              SUM(fo.outstanding) AS outstanding
       FROM fee_outstanding fo
       JOIN students s ON s.id = fo.student_id
       JOIN classes c ON c.id = $1
       WHERE fo.term_id = $2 AND s.class_id = $1
       GROUP BY s.id, s.admission_number, s.name, c.name
       ORDER BY outstanding DESC`,
      [class_id, term_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST collect fee at counter (Method 2)
router.post('/collect/counter', authenticate, authorize('school_admin', 'teacher'), async (req, res, next) => {
  try {
    const { student_id, term_id, amount, fee_head_ids } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: [tx] } = await client.query(
        `INSERT INTO fee_transactions (school_id, student_id, term_id, collection_method, amount, net_amount, payment_date, collected_by)
         VALUES ($1, $2, $3, 'counter', $4, $4, CURRENT_DATE, $5) RETURNING *`,
        [req.user.school_id, student_id, term_id, amount, req.user.sub]
      );
      // Generate receipt number
      const receiptNo = `RCP-${Date.now()}`;
      await client.query(
        `INSERT INTO fee_receipts (school_id, transaction_id, receipt_number) VALUES ($1, $2, $3)`,
        [req.user.school_id, tx.id, receiptNo]
      );
      await client.query('COMMIT');
      res.status(201).json({ transaction: tx, receipt_number: receiptNo });
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }
  } catch (err) { next(err); }
});

// POST generate challan (Method 1)
router.post('/challan/generate', authenticate, authorize('school_admin'), async (req, res, next) => {
  try {
    const { student_id, term_id, amount } = req.body;
    const challanNumber = `CHL-${req.user.school_id?.slice(0, 6)}-${Date.now()}`;
    const { rows: [challan] } = await pool.query(
      `INSERT INTO challans (school_id, student_id, term_id, challan_number, amount, due_date)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE + INTERVAL '7 days') RETURNING *`,
      [req.user.school_id, student_id, term_id, challanNumber, amount]
    );
    // TODO: generate PDF via PDFKit
    res.status(201).json(challan);
  } catch (err) { next(err); }
});

// POST upload bank statement for reconciliation (Method 1)
router.post('/reconcile/upload', authenticate, authorize('school_admin'), async (req, res, next) => {
  try {
    const { transactions } = req.body; // parsed CSV rows
    let reconciled = 0;
    for (const row of transactions) {
      // AI or rule-based matching by challan number in narration
      const { rows: [challan] } = await pool.query(
        `SELECT * FROM challans WHERE challan_number = $1 AND school_id = $2`,
        [row.challan_number, req.user.school_id]
      );
      if (challan) {
        await pool.query(
          `INSERT INTO bank_statements (school_id, bank_name, transaction_date, amount, reference_number, narration, challan_number, student_id, is_reconciled)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
          [req.user.school_id, row.bank, row.date, row.amount, row.reference, row.narration, challan.challan_number, challan.student_id]
        );
        reconciled++;
      }
    }
    res.json({ total: transactions.length, reconciled });
  } catch (err) { next(err); }
});

// GET fee concession report
router.get('/concessions', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.name AS student_name, c.name AS class_name, fh.name AS fee_head,
              cat.name AS category, t.name AS term, fs.amount AS actual,
              fc.concession_amount, ROUND(fc.concession_amount / fs.amount * 100, 2) AS concession_pct
       FROM fee_concessions fc
       JOIN students s ON s.id = fc.student_id
       JOIN classes c ON c.id = s.class_id
       JOIN fee_heads fh ON fh.id = fc.fee_head_id
       JOIN concession_categories cat ON cat.id = fc.concession_category_id
       JOIN terms t ON t.id = fc.term_id
       JOIN fee_structures fs ON fs.fee_head_id = fc.fee_head_id AND fs.term_id = fc.term_id AND fs.class_id = s.class_id
       WHERE fc.school_id = $1
       ORDER BY s.name`,
      [req.user.school_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
