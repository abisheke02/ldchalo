const router    = require('express').Router();
const { query } = require('../../config/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

const staff = [requireAuth, requireRole('teacher', 'school_admin', 'super_admin')];

/* ── helper: simple HTML → inline PDF using plain text receipt ── */
function buildReceiptHTML(receipt, student, school) {
  const fmt  = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`;
  const date = new Date(receipt.created_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  body{font-family:Arial,sans-serif;margin:40px;color:#111;font-size:13px}
  .header{text-align:center;border-bottom:2px solid #0891B2;padding-bottom:16px;margin-bottom:20px}
  .school-name{font-size:22px;font-weight:700;color:#0e3a5c}
  .receipt-title{font-size:16px;color:#0891B2;margin-top:6px;font-weight:600}
  .row{display:flex;justify-content:space-between;margin-bottom:8px}
  .label{color:#6B7280;font-size:12px}
  .value{font-weight:600}
  .amount-box{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;text-align:center;margin:20px 0}
  .amount{font-size:28px;font-weight:800;color:#059669}
  .footer{margin-top:32px;border-top:1px solid #e5e7eb;padding-top:16px;font-size:11px;color:#9CA3AF;text-align:center}
</style></head><body>
<div class="header">
  <div class="school-name">${school?.name || 'LD Schools'}</div>
  <div class="receipt-title">Fee Payment Receipt</div>
</div>
<div class="row"><span class="label">Receipt No.</span><span class="value">${receipt.receipt_no}</span></div>
<div class="row"><span class="label">Date</span><span class="value">${date}</span></div>
<div class="row"><span class="label">Student Name</span><span class="value">${student?.name || '—'}</span></div>
<div class="row"><span class="label">Class</span><span class="value">${student?.class_grade ? `Grade ${student.class_grade}` : '—'}</span></div>
<div class="row"><span class="label">Payment Mode</span><span class="value" style="text-transform:capitalize">${receipt.payment_mode}</span></div>
<div class="amount-box"><div class="amount">${fmt(receipt.amount)}</div><div style="color:#059669;font-size:12px;margin-top:4px">Amount Paid</div></div>
${receipt.note ? `<div style="background:#fef9c3;padding:10px;border-radius:6px;font-size:12px;color:#78350f">Note: ${receipt.note}</div>` : ''}
<div class="footer">
  This is a computer-generated receipt. No signature required.<br/>
  ${school?.name || 'LD Schools'} · ${school?.phone || ''} · ${school?.email || ''}
</div>
</body></html>`;
}

/* ── Fee Receipt PDF ── */
router.get('/fee-receipt/:transactionId', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT ft.*, u.name AS student_name, s.class_grade
       FROM fee_transactions ft
       JOIN users u ON u.id = ft.student_id
       LEFT JOIN students s ON s.user_id = ft.student_id
       WHERE ft.id = $1`,
      [req.params.transactionId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Receipt not found' });

    const receipt = rows[0];
    const school  = (await query('SELECT * FROM schools WHERE id = $1', [receipt.school_id])).rows[0];
    const student = { name: receipt.student_name, class_grade: receipt.class_grade };

    const html = buildReceiptHTML(receipt, student, school);
    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (err) { next(err); }
});

/* ── Fee Outstanding Report (JSON) ── */
router.get('/fee-outstanding', ...staff, async (req, res, next) => {
  try {
    const { class_id } = req.query;
    const vals = [req.user.schoolId];
    const classFilter = class_id ? `AND u.id IN (SELECT student_id FROM class_students WHERE class_id = $${vals.push(class_id)})` : '';

    const { rows } = await query(
      `SELECT u.id AS student_id, u.name, u.phone,
              fo.total_due, fo.total_paid, fo.balance,
              c.name AS class_name
       FROM fee_outstanding fo
       JOIN users u ON u.id = fo.student_id
       LEFT JOIN class_students cs ON cs.student_id = fo.student_id
       LEFT JOIN classes c ON c.id = cs.class_id
       WHERE fo.school_id = $1 AND fo.balance > 0
       ${classFilter}
       ORDER BY fo.balance DESC`,
      vals
    );

    const total_due  = rows.reduce((s, r) => s + Number(r.total_due  || 0), 0);
    const total_paid = rows.reduce((s, r) => s + Number(r.total_paid || 0), 0);
    const balance    = rows.reduce((s, r) => s + Number(r.balance    || 0), 0);

    res.json({ rows, summary: { total_due, total_paid, balance } });
  } catch (err) { next(err); }
});

/* ── Progress Card (simple HTML view) ── */
router.get('/progress-card/:studentId/:examId', requireAuth, async (req, res, next) => {
  try {
    const { studentId, examId } = req.params;

    const [studentRes, examRes, marksRes, schoolRes] = await Promise.all([
      query(`SELECT u.name, u.email, s.class_grade FROM users u LEFT JOIN students s ON s.user_id = u.id WHERE u.id = $1`, [studentId]),
      query('SELECT * FROM exams WHERE id = $1', [examId]),
      query(
        `SELECT m.*, sub.name AS subject_name, m.marks_obtained, m.max_marks,
                ROUND((m.marks_obtained / m.max_marks) * 100, 1) AS percentage
         FROM marks m JOIN subjects sub ON sub.id = m.subject_id
         WHERE m.exam_id = $1 AND m.student_id = $2 ORDER BY sub.name`,
        [examId, studentId]
      ),
      query('SELECT * FROM schools WHERE id = $1', [req.user.schoolId]),
    ]);

    const student = studentRes.rows[0];
    const exam    = examRes.rows[0];
    const marks   = marksRes.rows;
    const school  = schoolRes.rows[0];

    if (!student || !exam) return res.status(404).json({ error: 'Not found' });

    const totalObtained = marks.reduce((s, m) => s + Number(m.marks_obtained || 0), 0);
    const totalMax      = marks.reduce((s, m) => s + Number(m.max_marks || 100), 0);
    const overallPct    = totalMax ? Math.round((totalObtained / totalMax) * 100) : 0;
    const grade         = overallPct >= 90 ? 'A+' : overallPct >= 80 ? 'A' : overallPct >= 70 ? 'B+' : overallPct >= 60 ? 'B' : overallPct >= 50 ? 'C' : 'D';

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  body{font-family:Arial,sans-serif;margin:40px;color:#111;font-size:13px}
  .header{text-align:center;border-bottom:3px solid #0e3a5c;padding-bottom:16px;margin-bottom:24px}
  .school-name{font-size:22px;font-weight:700;color:#0e3a5c}
  .sub{font-size:13px;color:#6B7280;margin-top:4px}
  .title{font-size:17px;font-weight:700;color:#0891B2;margin-top:8px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-bottom:20px;background:#f8fafc;padding:14px;border-radius:8px}
  .info-label{font-size:11px;color:#6B7280;text-transform:uppercase}
  .info-val{font-weight:600;font-size:13px}
  table{width:100%;border-collapse:collapse}
  th{background:#0e3a5c;color:#fff;padding:9px 12px;text-align:left;font-size:12px}
  td{padding:9px 12px;border-bottom:1px solid #e5e7eb}
  tr:nth-child(even) td{background:#f9fafb}
  .summary{margin-top:20px;display:flex;gap:16px;justify-content:flex-end}
  .summary-box{text-align:center;background:#0e3a5c;color:#fff;border-radius:10px;padding:14px 20px}
  .summary-val{font-size:22px;font-weight:800}
  .summary-lbl{font-size:11px;opacity:.75;margin-top:2px}
  .footer{margin-top:32px;border-top:1px solid #e5e7eb;padding-top:12px;font-size:11px;color:#9CA3AF;text-align:center}
  @media print{body{margin:20px}}
</style></head><body>
<div class="header">
  <div class="school-name">${school?.name || 'LD Schools'}</div>
  <div class="sub">${school?.location || ''}</div>
  <div class="title">Progress Card — ${exam.name}</div>
</div>
<div class="info-grid">
  <div><div class="info-label">Student Name</div><div class="info-val">${student.name}</div></div>
  <div><div class="info-label">Class / Grade</div><div class="info-val">${student.class_grade ? `Grade ${student.class_grade}` : '—'}</div></div>
  <div><div class="info-label">Exam Type</div><div class="info-val" style="text-transform:capitalize">${exam.exam_type?.replace('_',' ')}</div></div>
  <div><div class="info-label">Exam Period</div><div class="info-val">${exam.start_date ? new Date(exam.start_date).toLocaleDateString('en-IN') : '—'}</div></div>
</div>
<table>
  <thead><tr><th>Subject</th><th>Max Marks</th><th>Marks Obtained</th><th>%</th><th>Grade</th></tr></thead>
  <tbody>
    ${marks.map((m) => {
      const pct = Math.round((Number(m.marks_obtained) / Number(m.max_marks)) * 100);
      const g   = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B+' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : 'D';
      return `<tr>
        <td>${m.subject_name}</td>
        <td>${m.max_marks}</td>
        <td>${m.marks_obtained}</td>
        <td>${pct}%</td>
        <td style="font-weight:700;color:${pct>=70?'#059669':'#DC2626'}">${g}</td>
      </tr>`;
    }).join('')}
  </tbody>
</table>
<div class="summary">
  <div class="summary-box"><div class="summary-val">${totalObtained}/${totalMax}</div><div class="summary-lbl">Total Marks</div></div>
  <div class="summary-box"><div class="summary-val">${overallPct}%</div><div class="summary-lbl">Overall %</div></div>
  <div class="summary-box" style="background:${overallPct>=70?'#059669':'#DC2626'}"><div class="summary-val">${grade}</div><div class="summary-lbl">Overall Grade</div></div>
</div>
<div class="footer">
  Generated on ${new Date().toLocaleDateString('en-IN')} · ${school?.name || 'LD Schools'}<br/>
  This is a computer-generated progress card.
</div>
</body></html>`;

    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (err) { next(err); }
});

/* ── Attendance Summary Report ── */
router.get('/attendance-summary', ...staff, async (req, res, next) => {
  try {
    const { month, year, class_id } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year)  || new Date().getFullYear();

    const vals = [req.user.schoolId, m, y];
    const classFilter = class_id
      ? `AND sa.student_id IN (SELECT student_id FROM class_students WHERE class_id = $${vals.push(class_id)})`
      : '';

    const { rows } = await query(
      `SELECT u.id, u.name,
              COUNT(*) FILTER (WHERE sa.status='present')::int AS present,
              COUNT(*) FILTER (WHERE sa.status='absent')::int  AS absent,
              COUNT(*) FILTER (WHERE sa.status='late')::int    AS late,
              COUNT(*)::int AS total,
              ROUND(COUNT(*) FILTER (WHERE sa.status='present') * 100.0 / NULLIF(COUNT(*),0), 1) AS pct
       FROM student_attendance sa
       JOIN users u ON u.id = sa.student_id
       WHERE u.school_id = $1
         AND EXTRACT(MONTH FROM sa.date) = $2
         AND EXTRACT(YEAR  FROM sa.date) = $3
         ${classFilter}
       GROUP BY u.id, u.name ORDER BY pct ASC`,
      vals
    );
    res.json({ month: m, year: y, rows });
  } catch (err) { next(err); }
});

module.exports = router;
