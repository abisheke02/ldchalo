const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

// Get exercises by type
router.get('/exercises', requireAuth, async (req, res, next) => {
  try {
    const { type, level } = req.query;
    const student = (await query('SELECT current_level FROM students WHERE user_id=$1', [req.user.id])).rows[0];
    const targetLevel = level || student?.current_level || 1;

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

// Start practice session
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

// Record attempt within session
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

    // Adaptive: update level if enough data
    const { rows: stats } = await query(
      `SELECT ROUND(AVG(score),0) AS avg_score, COUNT(*)::int AS cnt
       FROM practice_session_exercises pse
       JOIN practice_sessions ps ON ps.id = pse.session_id
       WHERE ps.user_id=$1 AND ps.created_at > NOW() - INTERVAL '7 days'`,
      [req.user.id]
    );
    const avg = Number(stats[0]?.avg_score);
    if (stats[0]?.cnt >= 10) {
      if (avg >= 80) {
        await query('UPDATE students SET current_level = LEAST(current_level+1,5) WHERE user_id=$1', [req.user.id]);
      } else if (avg < 50) {
        await query('UPDATE students SET current_level = GREATEST(current_level-1,1) WHERE user_id=$1', [req.user.id]);
      }
    }

    res.json({ correct, score });
  } catch (err) { next(err); }
});

// Complete session
router.post('/sessions/:sessionId/complete', requireAuth, async (req, res, next) => {
  try {
    const { duration_minutes } = req.body;
    await query(
      `UPDATE practice_sessions SET status='completed', duration_minutes=$1, completed_at=NOW()
       WHERE id=$2 AND user_id=$3`,
      [duration_minutes || 0, req.params.sessionId, req.user.id]
    );
    // Update streak
    await query(
      `UPDATE students SET streak_count = streak_count + 1,
         last_activity_at = NOW()
       WHERE user_id=$1 AND
         (last_activity_at IS NULL OR last_activity_at < CURRENT_DATE)`,
      [req.user.id]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Practice history
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT ps.*, COUNT(pse.id)::int AS exercises_done, ROUND(AVG(pse.score),0) AS avg_score
       FROM practice_sessions ps
       LEFT JOIN practice_session_exercises pse ON pse.session_id = ps.id
       WHERE ps.user_id=$1
       GROUP BY ps.id ORDER BY ps.created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Error summary
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

// Sync offline sessions
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
