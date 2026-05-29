const router = require('express').Router();
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const PDFDocument = require('pdfkit');

// GET class-wise fee outstanding report
router.get('/fee-outstanding', authenticate, async (req, res, next) => {
  try {
    const { term_id, class_id } = req.query;
    let q = `SELECT s.admission_number, s.name AS student_name, c.name AS class_name, c.section,
                    SUM(fo.total_fee) AS total_fees, SUM(fo.paid_amount) AS receipts,
                    SUM(fo.outstanding) AS outstanding
             FROM fee_outstanding fo
             JOIN students s ON s.id = fo.student_id
             JOIN classes c ON c.id = s.class_id
             WHERE fo.school_id = $1`;
    const params = [req.user.school_id];
    if (term_id) { params.push(term_id); q += ` AND fo.term_id = $${params.length}`; }
    if (class_id) { params.push(class_id); q += ` AND s.class_id = $${params.length}`; }
    q += ` GROUP BY s.id, s.admission_number, s.name, c.name, c.section
           HAVING SUM(fo.outstanding) > 0
           ORDER BY outstanding DESC`;
    const { rows } = await pool.query(q, params);
    const total = rows.reduce((acc, r) => ({
      total_fees: acc.total_fees + parseFloat(r.total_fees),
      receipts: acc.receipts + parseFloat(r.receipts),
      outstanding: acc.outstanding + parseFloat(r.outstanding),
    }), { total_fees: 0, receipts: 0, outstanding: 0 });
    res.json({ rows, totals: total });
  } catch (err) { next(err); }
});

// GET attendance report (monthly)
router.get('/attendance', authenticate, async (req, res, next) => {
  try {
    const { class_id, month, year } = req.query;
    const { rows } = await pool.query(
      `SELECT s.roll_number, s.name,
              COUNT(*) FILTER (WHERE sa.status='present') AS present,
              COUNT(*) FILTER (WHERE sa.status='absent') AS absent,
              COUNT(*) FILTER (WHERE sa.status='late') AS late,
              COUNT(DISTINCT sa.date) AS days_recorded,
              ROUND(COUNT(*) FILTER (WHERE sa.status='present')::numeric / NULLIF(COUNT(DISTINCT sa.date),0) * 100,1) AS attendance_pct
       FROM students s
       LEFT JOIN student_attendance sa ON sa.student_id = s.id
         AND EXTRACT(MONTH FROM sa.date)=$2 AND EXTRACT(YEAR FROM sa.date)=$3
       WHERE s.class_id = $1 AND s.is_active = true
       GROUP BY s.id, s.roll_number, s.name
       ORDER BY s.roll_number`,
      [class_id, month, year]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET fee collection summary (EOD)
router.get('/eod', authenticate, async (req, res, next) => {
  try {
    const { date } = req.query;
    const { rows } = await pool.query(
      `SELECT collection_method, COUNT(*) AS transactions, SUM(net_amount) AS total_collected
       FROM fee_transactions
       WHERE school_id=$1 AND payment_date=$2 AND status='success'
       GROUP BY collection_method`,
      [req.user.school_id, date || new Date().toISOString().slice(0, 10)]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET consolidated mark sheet PDF
router.get('/marksheet/:exam_id/:class_id/pdf', authenticate, async (req, res, next) => {
  try {
    const { rows: marks } = await pool.query(
      `SELECT s.roll_number, s.name, sub.name AS subject, m.total_marks, m.grade
       FROM marks m
       JOIN students s ON s.id = m.student_id
       JOIN subjects sub ON sub.id = m.subject_id
       WHERE m.exam_id=$1 AND s.class_id=$2
       ORDER BY s.roll_number, sub.name`,
      [req.params.exam_id, req.params.class_id]
    );

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="marksheet.pdf"');
    doc.pipe(res);

    doc.fontSize(16).text('Consolidated Mark Sheet', { align: 'center' });
    doc.moveDown();
    marks.forEach(r => {
      doc.fontSize(10).text(`${r.roll_number}. ${r.name} | ${r.subject}: ${r.total_marks} (${r.grade})`);
    });
    doc.end();
  } catch (err) { next(err); }
});

module.exports = router;
