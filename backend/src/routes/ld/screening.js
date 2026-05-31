const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

// Get screening questions
router.get('/questions', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, question_text, question_type, options, media_url
       FROM screening_questions WHERE is_active=TRUE ORDER BY order_index LIMIT 20`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Submit screening answers
router.post('/submit', requireAuth, async (req, res, next) => {
  try {
    const { answers } = req.body;
    if (!Array.isArray(answers) || !answers.length) return res.status(400).json({ error: 'answers[] required' });

    // Simple rule-based scoring
    let phonicsScore = 0, readingScore = 0, writingScore = 0, mathScore = 0;
    for (const a of answers) {
      if (a.category === 'phonics')  phonicsScore  += a.score || 0;
      if (a.category === 'reading')  readingScore  += a.score || 0;
      if (a.category === 'writing')  writingScore  += a.score || 0;
      if (a.category === 'math')     mathScore     += a.score || 0;
    }

    const total    = answers.length;
    const riskScore = Math.round(100 - ((phonicsScore + readingScore + writingScore + mathScore) / (total * 3)) * 100);
    const ldType   = riskScore > 70 ? 'dyslexia' : riskScore > 50 ? 'mixed' : 'not_detected';

    const sessionId = uuid();
    await query(
      `INSERT INTO screening_sessions (id, user_id, status, ld_type_detected, risk_score, completed_at)
       VALUES ($1,$2,'completed',$3,$4,NOW())`,
      [sessionId, req.user.id, ldType, riskScore]
    );
    await query(
      `INSERT INTO students (user_id, ld_type, ld_risk_score, last_screened_at)
       VALUES ($1,$2,$3,NOW())
       ON CONFLICT (user_id) DO UPDATE SET ld_type=$2, ld_risk_score=$3, last_screened_at=NOW()`,
      [req.user.id, ldType, riskScore]
    );

    res.json({ sessionId, ldType, riskScore });
  } catch (err) { next(err); }
});

// Screening status
router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT ss.*, s.ld_type, s.ld_risk_score FROM screening_sessions ss
       LEFT JOIN students s ON s.user_id = ss.user_id
       WHERE ss.user_id=$1 ORDER BY ss.created_at DESC LIMIT 1`,
      [req.user.id]
    );
    res.json(rows[0] || { status: 'not_started' });
  } catch (err) { next(err); }
});

module.exports = router;
