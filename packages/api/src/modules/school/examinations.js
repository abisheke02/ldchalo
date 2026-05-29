const router = require('express').Router();
const { pool } = require('../../config/database');
const { authenticate, authorize } = require('../../middleware/auth');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// GET all exams for an academic year
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { academic_year_id } = req.query;
    const { rows } = await pool.query(
      `SELECT e.*, t.name AS term_name FROM exams e
       LEFT JOIN terms t ON t.id = e.term_id
       WHERE e.school_id = $1 AND e.academic_year_id = $2
       ORDER BY e.start_date`,
      [req.user.school_id, academic_year_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST enter marks for a student (AnsApp concept)
router.post('/:exam_id/marks', authenticate, authorize('teacher', 'school_admin'), async (req, res, next) => {
  try {
    const { exam_id } = req.params;
    const { student_id, subject_id, pt1_marks, notebook_marks, enrichment_marks, half_yearly_marks, teacher_remark } = req.body;

    // Calculate total
    const total = (pt1_marks || 0) + (notebook_marks || 0) + (enrichment_marks || 0) + (half_yearly_marks || 0);

    // Get grade based on percentage
    const { rows: [exam] } = await pool.query('SELECT max_marks FROM exams WHERE id = $1', [exam_id]);
    const percentage = (total / exam.max_marks) * 100;
    const { rows: [gradeRow] } = await pool.query(
      `SELECT grade FROM grade_config WHERE $1 BETWEEN min_marks AND max_marks AND board_type = 'CBSE' LIMIT 1`,
      [percentage]
    );

    // AI-rephrase teacher remark
    let ai_remark = null;
    if (teacher_remark && process.env.ANTHROPIC_API_KEY) {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Rephrase this teacher remark professionally for a school report card in 1-2 sentences: "${teacher_remark}"`
        }]
      });
      ai_remark = msg.content[0].text;
    }

    const { rows: [mark] } = await pool.query(
      `INSERT INTO marks (exam_id, student_id, subject_id, pt1_marks, notebook_marks, enrichment_marks, half_yearly_marks, total_marks, grade, teacher_remark, ai_remark, entered_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (exam_id, student_id, subject_id) DO UPDATE
       SET pt1_marks=$4, notebook_marks=$5, enrichment_marks=$6, half_yearly_marks=$7,
           total_marks=$8, grade=$9, teacher_remark=$10, ai_remark=$11, entered_by=$12, entered_at=NOW()
       RETURNING *`,
      [exam_id, student_id, subject_id, pt1_marks, notebook_marks, enrichment_marks, half_yearly_marks, total, gradeRow?.grade, teacher_remark, ai_remark, req.user.sub]
    );

    res.status(201).json(mark);
  } catch (err) { next(err); }
});

// GET consolidated marksheet for a class
router.get('/:exam_id/marksheet/:class_id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.roll_number, s.name AS student_name,
              json_agg(json_build_object(
                'subject', sub.name, 'total', m.total_marks, 'grade', m.grade
              ) ORDER BY sub.name) AS subjects,
              SUM(m.total_marks) AS grand_total
       FROM marks m
       JOIN students s ON s.id = m.student_id
       JOIN subjects sub ON sub.id = m.subject_id
       WHERE m.exam_id = $1 AND s.class_id = $2
       GROUP BY s.id, s.roll_number, s.name
       ORDER BY grand_total DESC`,
      [req.params.exam_id, req.params.class_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST publish report cards
router.post('/:exam_id/report-cards/publish', authenticate, authorize('principal', 'school_admin'), async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE report_cards SET is_published = true, published_at = NOW() WHERE exam_id = $1`,
      [req.params.exam_id]
    );
    // TODO: FCM push to parents + WhatsApp notification
    res.json({ message: 'Report cards published' });
  } catch (err) { next(err); }
});

module.exports = router;
