/**
 * Practice routes (mounted at /api/practice)
 * Delegates to the full adaptive engine at routes/ld/practice.js
 * This file exists for the /api/practice mount point alongside /api/ld/practice
 */
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const practiceEngine = require('../services/practiceEngine');

// ─── Adaptive Engine Endpoints ────────────────────────────────────

router.get('/start', requireAuth, async (req, res, next) => {
  try {
    const result = await practiceEngine.startSession(req.user.id);
    res.json({ ...result, message: result.resumed ? 'Resuming session' : "Let's go! 🚀" });
  } catch (err) { next(err); }
});

router.get('/next-exercise', requireAuth, async (req, res, next) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    const result = await practiceEngine.getNextExercise(sessionId, req.user.id);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/answer', requireAuth, async (req, res, next) => {
  try {
    const { sessionId, exerciseId, answer, durationSeconds } = req.body;
    if (!sessionId || !exerciseId || answer === undefined) {
      return res.status(400).json({ error: 'sessionId, exerciseId, and answer required' });
    }
    const result = await practiceEngine.submitAnswer(sessionId, req.user.id, exerciseId, answer, durationSeconds || 0);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

router.post('/complete', requireAuth, async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
    const result = await practiceEngine.completeSession(sessionId, req.user.id);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/progress', requireAuth, async (req, res, next) => {
  try { res.json(await practiceEngine.getProgress(req.user.id)); }
  catch (err) { next(err); }
});

router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const sessions = await practiceEngine.getHistory(req.user.id, parseInt(req.query.limit, 10) || 20);
    res.json({ sessions });
  } catch (err) { next(err); }
});

router.get('/streak', requireAuth, async (req, res, next) => {
  try { res.json(await practiceEngine.getStreak(req.user.id)); }
  catch (err) { next(err); }
});

module.exports = router;
