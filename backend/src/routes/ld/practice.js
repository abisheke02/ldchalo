/**
 * LD Practice Routes — Adaptive Practice Engine (FR-03)
 * Enhanced with adaptive difficulty, spaced repetition, and AI feedback.
 *
 * Routes:
 *   GET  /api/ld/practice/start          — Start adaptive session
 *   GET  /api/ld/practice/next-exercise   — Get next adaptive exercise
 *   POST /api/ld/practice/answer          — Submit answer (returns AI feedback)
 *   POST /api/ld/practice/complete        — End session
 *   GET  /api/ld/practice/progress        — Overall progress
 *   GET  /api/ld/practice/history         — Past sessions
 *   GET  /api/ld/practice/streak          — Streak info
 *   GET  /api/ld/practice/exercises       — Get exercises (legacy/direct)
 *   POST /api/ld/practice/sessions/sync   — Offline sync
 */

const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');
const practiceEngine = require('../../services/practiceEngine');

// ═══════════════════════════════════════════════════════════════════
// ADAPTIVE ENGINE ROUTES (NEW — FR-03)
// ═══════════════════════════════════════════════════════════════════

// GET /start — Start an adaptive practice session
router.get('/start', requireAuth, async (req, res, next) => {
  try {
    const result = await practiceEngine.startSession(req.user.id);
    res.json({
      ...result,
      message: result.resumed
        ? 'Resuming your practice session'
        : "Practice session started! Let's go! 🚀",
    });
  } catch (err) { next(err); }
});

// GET /next-exercise — Get next adaptive exercise in active session
router.get('/next-exercise', requireAuth, async (req, res, next) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId query parameter is required' });
    }

    const result = await practiceEngine.getNextExercise(sessionId, req.user.id);
    if (result.complete) {
      return res.json({
        complete: true,
        totalAnswered: result.totalAnswered,
        message: 'Great job! You finished all exercises! 🎉',
      });
    }
    res.json(result);
  } catch (err) { next(err); }
});

// POST /answer — Submit an answer for the current exercise
router.post('/answer', requireAuth, async (req, res, next) => {
  try {
    const { sessionId, exerciseId, answer, durationSeconds } = req.body;
    if (!sessionId || !exerciseId || answer === undefined) {
      return res.status(400).json({ error: 'sessionId, exerciseId, and answer are required' });
    }

    const result = await practiceEngine.submitAnswer(
      sessionId, req.user.id, exerciseId, answer, durationSeconds || 0
    );

    // Encouraging response messages
    let message = '';
    if (result.isCorrect) {
      const msgs = ['Correct! 🌟', 'Great job! ⭐', 'You got it! 🎯', 'Wonderful! ✨', 'Perfect! 💫'];
      message = msgs[Math.floor(Math.random() * msgs.length)];
      if (result.streak >= 3) message += ` ${result.streak} in a row! 🔥`;
    } else {
      message = "Almost! Let's learn from this 💡";
    }

    if (result.levelChange?.levelChanged) {
      if (result.levelChange.direction === 'up') {
        message = `🎉 LEVEL UP! You're now Level ${result.levelChange.toLevel}! Keep shining! ⭐`;
      } else {
        message = "Let's practice a bit more at this level — you're doing great! 💪";
      }
    }

    res.json({ ...result, message });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// POST /complete — End the session, store stats
router.post('/complete', requireAuth, async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

    const result = await practiceEngine.completeSession(sessionId, req.user.id);

    let message = 'Practice complete! ';
    if (result.accuracy >= 80) message += "Amazing work — you're a star! 🌟";
    else if (result.accuracy >= 60) message += 'Good effort! Keep practicing! 💪';
    else message += 'Great try! Every practice makes you stronger! 🌱';

    res.json({ ...result, message });
  } catch (err) { next(err); }
});

// GET /progress — Overall progress (level, streak, mastery)
router.get('/progress', requireAuth, async (req, res, next) => {
  try {
    const progress = await practiceEngine.getProgress(req.user.id);
    res.json(progress);
  } catch (err) { next(err); }
});

// GET /history — Past sessions
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const sessions = await practiceEngine.getHistory(req.user.id, limit);
    res.json({ sessions });
  } catch (err) { next(err); }
});

// GET /streak — Streak info with last 7 days
router.get('/streak', requireAuth, async (req, res, next) => {
  try {
    const streak = await practiceEngine.getStreak(req.user.id);
    res.json(streak);
  } catch (err) { next(err); }
});

// ═══════════════════════════════════════════════════════════════════
// LEGACY ROUTES (backward-compatible)
// ═══════════════════════════════════════════════════════════════════

// GET /exercises — Get exercises by type/level (direct fetch)
router.get('/exercises', requireAuth, async (req, res, next) => {
  try {
    const { type, level } = req.query;
    const state = await practiceEngine.getStudentState(req.user.id);
    const targetLevel = level || state?.current_level || 1;

    const vals = [targetLevel];
    const typeFilter = type ? `AND type=$${vals.push(type)}` : '';
    const { rows } = await query(
      `SELECT id, type, level, title, instructions, content, media_url
       FROM exercises WHERE level=$1 AND is_active=TRUE ${typeFilter}
       ORDER BY RANDOM() LIMIT 10`,
      vals
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /sessions/start — Legacy session start (simple)
router.post('/sessions/start', requireAuth, async (req, res, next) => {
  try {
    const { session_type = 'practice' } = req.body;
    const { rows } = await query(
      `INSERT INTO practice_sessions (id, user_id, session_type, status)
       VALUES ($1,$2,$3,'active') RETURNING *`,
      [uuid(), req.user.id, session_type]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// POST /sessions/:sessionId/attempt — Legacy attempt recording
router.post('/sessions/:sessionId/attempt', requireAuth, async (req, res, next) => {
  try {
    const { exercise_id, user_answer, correct_answer, score, duration_seconds, error_type } = req.body;
    const correct = String(user_answer).toLowerCase().trim() === String(correct_answer).toLowerCase().trim();

    await query(
      `INSERT INTO practice_session_exercises
         (id, session_id, exercise_id, user_answer, is_correct, score, duration_seconds)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [uuid(), req.params.sessionId, exercise_id, user_answer, correct || (score >= 70), score || 0, duration_seconds || 0]
    );

    if (!correct && error_type) {
      await query(
        `INSERT INTO student_errors (id, user_id, exercise_id, error_type)
         VALUES ($1,$2,$3,$4)`,
        [uuid(), req.user.id, exercise_id, error_type]
      );
    }

    res.json({ correct, score });
  } catch (err) { next(err); }
});

// POST /sessions/:sessionId/complete — Legacy session complete
router.post('/sessions/:sessionId/complete', requireAuth, async (req, res, next) => {
  try {
    const { duration_minutes } = req.body;
    await query(
      `UPDATE practice_sessions SET status='completed', duration_minutes=$1, completed_at=NOW()
       WHERE id=$2 AND user_id=$3`,
      [duration_minutes || 0, req.params.sessionId, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// GET /errors — Error summary
router.get('/errors', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT error_type, COUNT(*)::int AS count FROM student_errors
       WHERE user_id=$1 AND created_at > NOW() - INTERVAL '30 days'
       GROUP BY error_type ORDER BY count DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /sessions/sync — Offline sync
router.post('/sessions/sync', requireAuth, async (req, res, next) => {
  try {
    const { sessions } = req.body;
    let synced = 0;
    for (const s of (sessions || [])) {
      const exists = (await query('SELECT 1 FROM practice_sessions WHERE id=$1', [s.id])).rows.length;
      if (!exists) {
        await query(
          `INSERT INTO practice_sessions (id, user_id, session_type, status, duration_minutes, created_at)
           VALUES ($1,$2,$3,'completed',$4,$5) ON CONFLICT DO NOTHING`,
          [s.id, req.user.id, s.session_type || 'practice', s.duration_minutes || 0, s.created_at || new Date()]
        );
        synced++;
      }
    }
    res.json({ synced });
  } catch (err) { next(err); }
});

module.exports = router;
