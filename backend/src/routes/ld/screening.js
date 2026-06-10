const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');
const { classifyLD } = require('../../services/ldClassifier');

// Get screening questions
router.get('/questions', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, question_text, question_type, options AS options_json, correct_answer, category, media_url
       FROM screening_questions WHERE is_active=TRUE ORDER BY order_index LIMIT 20`
    );
    res.json({ questions: rows });
  } catch (err) { next(err); }
});

// Submit screening answers — uses AI classifier (Claude) with rule-based fallback
router.post('/submit', requireAuth, async (req, res, next) => {
  try {
    const { answers, duration_seconds } = req.body;
    if (!Array.isArray(answers) || !answers.length) return res.status(400).json({ error: 'answers[] required' });

    // Prepare data for AI classifier
    const classifierInput = answers.map(a => ({
      questionText: a.question_text || `Question ${a.question_id}`,
      category: a.category || 'reading',
      studentAnswer: a.student_answer,
      correctAnswer: a.correct_answer,
      isCorrect: a.is_correct,
      responseTimeMs: a.response_time_ms || 0,
    }));

    // Run AI classification (falls back to rule-based if no API key)
    const result = await classifyLD(classifierInput);

    const sessionId = uuid();
    await query(
      `INSERT INTO screening_sessions (id, user_id, status, ld_type_detected, risk_score, result_data, completed_at)
       VALUES ($1,$2,'completed',$3,$4,$5,NOW())`,
      [sessionId, req.user.id, result.ldType, result.riskScore, JSON.stringify(result)]
    );
    await query(
      `INSERT INTO students (user_id, ld_type, ld_risk_score, current_level, last_screened_at)
       VALUES ($1,$2,$3,1,NOW())
       ON CONFLICT (user_id) DO UPDATE SET ld_type=$2, ld_risk_score=$3, last_screened_at=NOW()`,
      [req.user.id, result.ldType, result.riskScore]
    );

    res.json({
      sessionId,
      ldType: result.ldType,
      overallRiskScore: result.riskScore,
      breakdown: result.breakdown || null,
      recommendations: result.recommendations || [],
      reasoning: result.reasoning || '',
      classifiedBy: result.classifiedBy || 'unknown',
    });
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
    if (!rows[0] || rows[0].status !== 'completed') {
      return res.json({ screened: false, status: rows[0]?.status || 'not_started' });
    }
    res.json({ screened: true, ...rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
