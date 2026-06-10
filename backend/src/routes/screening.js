/**
 * LD Screening Quiz API Routes
 * All routes require authentication (requireAuth middleware applied at mount)
 */

const router = require('express').Router();
const { query } = require('../config/database');
const screeningService = require('../services/screeningService');

// GET /api/screening/questions — Get all active screening questions (ordered)
router.get('/questions', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, question_text, question_type, category, options, order_index
       FROM screening_questions
       WHERE is_active = TRUE
       ORDER BY order_index ASC`
    );

    res.json({
      questions: rows,
      total: rows.length,
      estimatedMinutes: 10,
    });
  } catch (err) { next(err); }
});

// POST /api/screening/start — Start a new screening session
router.post('/start', async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Check if user has an in-progress session (prevent duplicates)
    const { rows: existing } = await query(
      `SELECT id FROM screening_sessions
       WHERE user_id = $1 AND status = 'in_progress'
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (existing[0]) {
      // Resume existing session
      return res.json({
        sessionId: existing[0].id,
        resumed: true,
        message: 'Resuming existing screening session',
      });
    }

    const result = await screeningService.startSession(userId);
    res.status(201).json({
      ...result,
      resumed: false,
      message: 'Screening session started',
    });
  } catch (err) { next(err); }
});

// POST /api/screening/answer — Submit answer for a question
router.post('/answer', async (req, res, next) => {
  try {
    const { sessionId, questionId, answer, timeSpentMs } = req.body;

    if (!sessionId || !questionId || answer === undefined) {
      return res.status(400).json({ error: 'sessionId, questionId, and answer are required' });
    }

    const result = await screeningService.submitAnswer(sessionId, questionId, answer, timeSpentMs);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /api/screening/complete — Complete session and trigger AI classification
router.post('/complete', async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    const result = await screeningService.completeSession(sessionId);
    res.json({
      message: 'Screening complete',
      ...result,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// GET /api/screening/result/:sessionId — Get screening result
router.get('/result/:sessionId', async (req, res, next) => {
  try {
    const result = await screeningService.getResult(req.params.sessionId);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// GET /api/screening/history — Get past screening sessions for current user
router.get('/history', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const sessions = await screeningService.getHistory(userId);
    res.json({ sessions, total: sessions.length });
  } catch (err) { next(err); }
});

module.exports = router;
