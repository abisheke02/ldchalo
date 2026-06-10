/**
 * Spaced Repetition Service
 * Simplified SM-2 algorithm adapted for children with learning disabilities.
 *
 * Intervals: 1d → 3d → 7d → 14d → 30d → 60d
 * On failure: reset to 1 day (but keep ease_factor degraded slightly)
 * On success: advance to next interval, improve ease_factor
 */

const { query } = require('../config/database');

// ─── Interval progression (in days) ───────────────────────────────
const INTERVALS = [1, 3, 7, 14, 30, 60];

/**
 * Get exercises due for review for a given user.
 * Returns exercises whose next_review_at <= NOW().
 */
async function getDueExercises(userId, limit = 10) {
  const { rows } = await query(
    `SELECT srs.exercise_id, srs.interval_days, srs.repetition_count,
            e.type, e.level, e.title, e.instructions, e.content, e.ld_types
     FROM spaced_repetition_schedule srs
     JOIN exercises e ON e.id = srs.exercise_id
     WHERE srs.user_id = $1
       AND srs.next_review_at <= NOW()
       AND e.is_active = TRUE
     ORDER BY srs.next_review_at ASC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

/**
 * Update spaced repetition schedule after an exercise attempt.
 * @param {string} userId
 * @param {string} exerciseId
 * @param {boolean} isCorrect
 */
async function updateRepetition(userId, exerciseId, isCorrect) {
  // Check if schedule exists
  const { rows } = await query(
    'SELECT id, interval_days, ease_factor, repetition_count FROM spaced_repetition_schedule WHERE user_id = $1 AND exercise_id = $2',
    [userId, exerciseId]
  );

  if (rows.length === 0) {
    // First time failing this exercise — create schedule
    if (!isCorrect) {
      await query(
        `INSERT INTO spaced_repetition_schedule (id, user_id, exercise_id, next_review_at, interval_days, ease_factor, repetition_count, last_reviewed_at)
         VALUES (uuid_generate_v4(), $1, $2, NOW() + INTERVAL '1 day', 1, 2.5, 0, NOW())
         ON CONFLICT (user_id, exercise_id) DO NOTHING`,
        [userId, exerciseId]
      );
    }
    return;
  }

  const schedule = rows[0];
  let { interval_days, ease_factor, repetition_count } = schedule;

  if (isCorrect) {
    // Advance interval
    repetition_count += 1;
    const intervalIdx = INTERVALS.indexOf(interval_days);
    if (intervalIdx < INTERVALS.length - 1) {
      interval_days = INTERVALS[intervalIdx + 1];
    } else {
      // Beyond max interval — multiply by ease factor
      interval_days = Math.round(interval_days * ease_factor);
    }
    // Slightly improve ease factor (cap at 3.0)
    ease_factor = Math.min(3.0, ease_factor + 0.1);
  } else {
    // Reset to 1 day on failure
    interval_days = 1;
    repetition_count = 0;
    // Slightly degrade ease factor (floor at 1.5)
    ease_factor = Math.max(1.5, ease_factor - 0.2);
  }

  await query(
    `UPDATE spaced_repetition_schedule
     SET next_review_at = NOW() + make_interval(days => $3),
         interval_days = $3,
         ease_factor = $4,
         repetition_count = $5,
         last_reviewed_at = NOW()
     WHERE user_id = $1 AND exercise_id = $2`,
    [userId, exerciseId, interval_days, ease_factor, repetition_count]
  );
}

/**
 * Schedule a failed exercise for review (if not already scheduled).
 */
async function scheduleForReview(userId, exerciseId) {
  await query(
    `INSERT INTO spaced_repetition_schedule (id, user_id, exercise_id, next_review_at, interval_days, ease_factor, repetition_count, last_reviewed_at)
     VALUES (uuid_generate_v4(), $1, $2, NOW() + INTERVAL '1 day', 1, 2.5, 0, NOW())
     ON CONFLICT (user_id, exercise_id) DO UPDATE SET
       next_review_at = CASE
         WHEN spaced_repetition_schedule.next_review_at > NOW() THEN spaced_repetition_schedule.next_review_at
         ELSE NOW() + INTERVAL '1 day'
       END,
       last_reviewed_at = NOW()`,
    [userId, exerciseId]
  );
}

/**
 * Remove an exercise from review schedule (mastered after many correct reviews).
 */
async function removeFromSchedule(userId, exerciseId) {
  await query(
    'DELETE FROM spaced_repetition_schedule WHERE user_id = $1 AND exercise_id = $2',
    [userId, exerciseId]
  );
}

/**
 * Get count of exercises due for review.
 */
async function getDueCount(userId) {
  const { rows } = await query(
    'SELECT COUNT(*) AS count FROM spaced_repetition_schedule WHERE user_id = $1 AND next_review_at <= NOW()',
    [userId]
  );
  return parseInt(rows[0].count, 10);
}

module.exports = {
  getDueExercises,
  updateRepetition,
  scheduleForReview,
  removeFromSchedule,
  getDueCount,
  INTERVALS,
};
