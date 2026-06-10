/**
 * Exercise Selector Service
 * Handles intelligent exercise selection based on LD type, level,
 * weaknesses, spaced repetition, and session context.
 */

const { query } = require('../config/database');
const spacedRepetition = require('./spacedRepetition');

// ─── LD Type → Exercise type mapping ──────────────────────────────
const LD_TYPE_EXERCISE_MAP = {
  dyslexia: ['letter_recognition', 'phonics', 'word_building', 'reading'],
  dyscalculia: ['number_sense', 'counting', 'arithmetic', 'patterns'],
  dysgraphia: ['tracing', 'sequencing', 'writing'],
  mixed: ['letter_recognition', 'phonics', 'word_building', 'reading', 'number_sense', 'counting', 'arithmetic', 'tracing', 'sequencing'],
  not_detected: ['letter_recognition', 'phonics', 'number_sense', 'counting', 'sequencing'],
};

/**
 * Select exercises matching the student's LD type and level.
 * @param {string} ldType - 'dyslexia' | 'dyscalculia' | 'dysgraphia' | 'mixed' | 'not_detected'
 * @param {number} level - Current difficulty level (1-5)
 * @param {number} limit - Max exercises to return
 * @param {string[]} excludeIds - Exercise IDs to exclude (already answered)
 */
async function selectByLDType(ldType, level, limit = 10, excludeIds = []) {
  const types = LD_TYPE_EXERCISE_MAP[ldType] || LD_TYPE_EXERCISE_MAP.not_detected;

  let excludeClause = '';
  const params = [types, level, limit];

  if (excludeIds.length > 0) {
    excludeClause = `AND e.id != ALL($4::uuid[])`;
    params.push(excludeIds);
  }

  const { rows } = await query(
    `SELECT e.id, e.type, e.level, e.title, e.instructions, e.content, e.media_url, e.ld_types
     FROM exercises e
     WHERE e.is_active = TRUE
       AND e.type = ANY($1::text[])
       AND e.level = $2
       ${excludeClause}
     ORDER BY RANDOM()
     LIMIT $3`,
    params
  );
  return rows;
}

/**
 * Select exercises from one level below (reinforcement).
 */
async function selectReinforcement(ldType, currentLevel, limit = 5, excludeIds = []) {
  const reinforcementLevel = Math.max(1, currentLevel - 1);
  return selectByLDType(ldType, reinforcementLevel, limit, excludeIds);
}

/**
 * Select exercises from one level above (challenge/stretch).
 */
async function selectChallenge(ldType, currentLevel, limit = 3, excludeIds = []) {
  const challengeLevel = Math.min(5, currentLevel + 1);
  return selectByLDType(ldType, challengeLevel, limit, excludeIds);
}

/**
 * Select exercises targeting the student's weakest categories.
 * Finds categories with highest error rates and picks exercises from those.
 */
async function selectByWeakness(userId, level, limit = 5, excludeIds = []) {
  // Find categories with most errors in last 30 days
  const { rows: weakCategories } = await query(
    `SELECT e.type, COUNT(*) AS error_count
     FROM student_errors se
     JOIN exercises e ON e.id = se.exercise_id
     WHERE se.user_id = $1
       AND se.created_at > NOW() - INTERVAL '30 days'
     GROUP BY e.type
     ORDER BY error_count DESC
     LIMIT 3`,
    [userId]
  );

  if (weakCategories.length === 0) return [];

  const weakTypes = weakCategories.map(r => r.type);

  let excludeClause = '';
  const params = [weakTypes, level, limit];
  if (excludeIds.length > 0) {
    excludeClause = 'AND e.id != ALL($4::uuid[])';
    params.push(excludeIds);
  }

  const { rows } = await query(
    `SELECT e.id, e.type, e.level, e.title, e.instructions, e.content, e.media_url, e.ld_types
     FROM exercises e
     WHERE e.is_active = TRUE
       AND e.type = ANY($1::text[])
       AND e.level <= $2
       ${excludeClause}
     ORDER BY RANDOM()
     LIMIT $3`,
    params
  );
  return rows;
}

/**
 * Get exercises due for spaced repetition review.
 */
async function selectReview(userId, limit = 6) {
  return spacedRepetition.getDueExercises(userId, limit);
}

/**
 * Get exercise IDs already answered in a session (to avoid repeats).
 */
async function getAnsweredInSession(sessionId) {
  const { rows } = await query(
    'SELECT exercise_id FROM practice_session_exercises WHERE session_id = $1',
    [sessionId]
  );
  return rows.map(r => r.exercise_id);
}

/**
 * Get a single next exercise adaptively based on session performance.
 * @param {string} sessionId - Current session
 * @param {string} userId - Student
 * @param {string} ldType - LD type
 * @param {number} currentLevel - Current level
 * @param {object} sessionStats - { consecutiveCorrect, consecutiveWrong, totalAnswered }
 */
async function getNextAdaptive(sessionId, userId, ldType, currentLevel, sessionStats) {
  const excludeIds = await getAnsweredInSession(sessionId);

  // Decide what type of exercise to serve based on recent performance
  const { consecutiveCorrect, consecutiveWrong, totalAnswered } = sessionStats;

  // Every 5th exercise: try a spaced repetition review
  if (totalAnswered > 0 && totalAnswered % 5 === 0) {
    const reviewExercises = await selectReview(userId, 1);
    if (reviewExercises.length > 0 && !excludeIds.includes(reviewExercises[0].exercise_id)) {
      return { ...reviewExercises[0], id: reviewExercises[0].exercise_id, source: 'review' };
    }
  }

  // If struggling (2+ wrong in a row): serve reinforcement (easier)
  if (consecutiveWrong >= 2) {
    const easier = await selectReinforcement(ldType, currentLevel, 1, excludeIds);
    if (easier.length > 0) return { ...easier[0], source: 'reinforcement' };
  }

  // If on a streak (3+ correct): serve a challenge
  if (consecutiveCorrect >= 3) {
    const harder = await selectChallenge(ldType, currentLevel, 1, excludeIds);
    if (harder.length > 0) return { ...harder[0], source: 'challenge' };
  }

  // If we have weakness data, 30% chance to target weakness
  if (Math.random() < 0.3) {
    const weakExercises = await selectByWeakness(userId, currentLevel, 1, excludeIds);
    if (weakExercises.length > 0) return { ...weakExercises[0], source: 'weakness' };
  }

  // Default: current level exercise
  const standard = await selectByLDType(ldType, currentLevel, 1, excludeIds);
  if (standard.length > 0) return { ...standard[0], source: 'standard' };

  // Fallback: any available exercise at any nearby level
  const { rows: fallback } = await query(
    `SELECT id, type, level, title, instructions, content, media_url, ld_types
     FROM exercises
     WHERE is_active = TRUE AND level BETWEEN $1 AND $2
       AND id != ALL($3::uuid[])
     ORDER BY RANDOM() LIMIT 1`,
    [Math.max(1, currentLevel - 1), Math.min(5, currentLevel + 1), excludeIds]
  );

  return fallback.length > 0 ? { ...fallback[0], source: 'fallback' } : null;
}

module.exports = {
  selectByLDType,
  selectReinforcement,
  selectChallenge,
  selectByWeakness,
  selectReview,
  getAnsweredInSession,
  getNextAdaptive,
  LD_TYPE_EXERCISE_MAP,
};
