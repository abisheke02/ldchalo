/**
 * Practice Engine Service — THE CORE ADAPTIVE ENGINE
 *
 * Manages practice sessions with adaptive difficulty:
 * - Selects exercises based on LD type, level, error history
 * - Adjusts difficulty: 3 correct → level up, 2 wrong → level down
 * - Integrates spaced repetition for review
 * - Tracks streaks, mastery, and progress
 */

const { v4: uuid } = require('uuid');
const { query } = require('../config/database');
const exerciseSelector = require('./exerciseSelector');
const spacedRepetition = require('./spacedRepetition');
const { generateWrongAnswerFeedback } = require('./claudeService');

// ─── Constants ─────────────────────────────────────────────────────
const SESSION_EXERCISE_COUNT = 20;
const LEVEL_UP_THRESHOLD = 3;    // consecutive correct to level up
const LEVEL_DOWN_THRESHOLD = 2;  // consecutive wrong to level down
const MAX_LEVEL = 5;
const MIN_LEVEL = 1;

// ─── Get or create student practice state ─────────────────────────
async function getStudentState(userId) {
  const { rows } = await query(
    'SELECT * FROM student_practice_state WHERE user_id = $1',
    [userId]
  );

  if (rows.length > 0) return rows[0];

  // Create default state — check screening result for initial level
  const { rows: screening } = await query(
    `SELECT ld_type_detected, risk_score FROM screening_sessions
     WHERE user_id = $1 AND status = 'completed'
     ORDER BY completed_at DESC LIMIT 1`,
    [userId]
  );

  // High risk → Level 1, Medium → Level 1, Low → Level 2
  let startLevel = 1;
  if (screening.length > 0 && screening[0].risk_score !== null) {
    startLevel = screening[0].risk_score <= 30 ? 2 : 1;
  }

  await query(
    `INSERT INTO student_practice_state (user_id, current_level, streak_count, mastery_data)
     VALUES ($1, $2, 0, '{}')
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, startLevel]
  );

  const { rows: newState } = await query(
    'SELECT * FROM student_practice_state WHERE user_id = $1',
    [userId]
  );
  return newState[0];
}

// ─── Get student's LD type from most recent screening ─────────────
async function getStudentLDType(userId) {
  const { rows } = await query(
    `SELECT ld_type_detected FROM screening_sessions
     WHERE user_id = $1 AND status = 'completed'
     ORDER BY completed_at DESC LIMIT 1`,
    [userId]
  );
  return rows.length > 0 ? rows[0].ld_type_detected : 'not_detected';
}

// ─── Start a new practice session ─────────────────────────────────
async function startSession(userId) {
  const state = await getStudentState(userId);
  const ldType = await getStudentLDType(userId);
  const sessionId = uuid();

  // Check for existing active session (allow resume)
  const { rows: existing } = await query(
    `SELECT id FROM practice_sessions
     WHERE user_id = $1 AND status = 'active'
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );

  if (existing.length > 0) {
    // Resume existing session
    const answeredIds = await exerciseSelector.getAnsweredInSession(existing[0].id);
    const reselected = await selectExercises(userId, ldType, state.current_level);
    const remaining = reselected.filter(e => !answeredIds.includes(e.id));

    return {
      sessionId: existing[0].id,
      resumed: true,
      level: state.current_level,
      ldType,
      exercises: remaining.length > 0 ? remaining : reselected,
      exercisesAnswered: answeredIds.length,
      exercisesTotal: SESSION_EXERCISE_COUNT,
    };
  }

  // Create new session
  await query(
    `INSERT INTO practice_sessions (id, user_id, session_type, status, ld_type, level_at_start)
     VALUES ($1, $2, 'adaptive', 'active', $3, $4)`,
    [sessionId, userId, ldType, state.current_level]
  );

  // Pre-select exercises for the session (adaptive mix)
  const exercises = await selectExercises(userId, ldType, state.current_level);

  return {
    sessionId,
    resumed: false,
    level: state.current_level,
    ldType,
    exercises,
    exercisesTotal: SESSION_EXERCISE_COUNT,
    exercisesAnswered: 0,
    firstExercise: exercises.length > 0 ? exercises[0] : null,
    streak: state.streak_count,
  };
}

/**
 * Select a curated set of exercises for a session.
 * Distribution: 40% current level, 30% review, 20% reinforcement, 10% challenge
 */
async function selectExercises(userId, ldType, currentLevel) {
  const currentCount = Math.round(SESSION_EXERCISE_COUNT * 0.4);  // 8
  const reviewCount = Math.round(SESSION_EXERCISE_COUNT * 0.3);   // 6
  const reinforceCount = Math.round(SESSION_EXERCISE_COUNT * 0.2); // 4
  const challengeCount = SESSION_EXERCISE_COUNT - currentCount - reviewCount - reinforceCount; // 2

  const [current, review, reinforce, challenge] = await Promise.all([
    exerciseSelector.selectByLDType(ldType, currentLevel, currentCount),
    exerciseSelector.selectReview(userId, reviewCount),
    exerciseSelector.selectReinforcement(ldType, currentLevel, reinforceCount),
    exerciseSelector.selectChallenge(ldType, currentLevel, challengeCount),
  ]);

  // Merge and shuffle
  const all = [
    ...current.map(e => ({ ...e, source: 'standard' })),
    ...review.map(e => ({ ...e, id: e.exercise_id || e.id, source: 'review' })),
    ...reinforce.map(e => ({ ...e, source: 'reinforcement' })),
    ...challenge.map(e => ({ ...e, source: 'challenge' })),
  ];

  // Shuffle with Fisher-Yates
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }

  return all.slice(0, SESSION_EXERCISE_COUNT);
}

// ─── Get next exercise adaptively within a session ────────────────
async function getNextExercise(sessionId, userId) {
  const state = await getStudentState(userId);
  const ldType = await getStudentLDType(userId);

  // Get session stats
  const { rows: sessionExercises } = await query(
    `SELECT is_correct FROM practice_session_exercises
     WHERE session_id = $1 ORDER BY exercise_order ASC`,
    [sessionId]
  );

  const totalAnswered = sessionExercises.length;

  if (totalAnswered >= SESSION_EXERCISE_COUNT) {
    return { complete: true, totalAnswered };
  }

  // Calculate consecutive correct/wrong from recent answers
  let consecutiveCorrect = 0;
  let consecutiveWrong = 0;
  for (let i = sessionExercises.length - 1; i >= 0; i--) {
    if (sessionExercises[i].is_correct) {
      if (consecutiveWrong > 0) break;
      consecutiveCorrect++;
    } else {
      if (consecutiveCorrect > 0) break;
      consecutiveWrong++;
    }
  }

  const exercise = await exerciseSelector.getNextAdaptive(
    sessionId, userId, ldType, state.current_level,
    { consecutiveCorrect, consecutiveWrong, totalAnswered }
  );

  if (!exercise) {
    return { complete: true, totalAnswered, reason: 'no_exercises_available' };
  }

  return {
    exercise,
    progress: {
      current: totalAnswered + 1,
      total: SESSION_EXERCISE_COUNT,
      consecutiveCorrect,
      level: state.current_level,
      streak: state.streak_count,
    },
  };
}

// ─── Submit an answer ─────────────────────────────────────────────
async function submitAnswer(sessionId, userId, exerciseId, userAnswer, durationSeconds) {
  // Get exercise details
  const { rows: exRows } = await query(
    'SELECT id, type, level, title, content, instructions FROM exercises WHERE id = $1',
    [exerciseId]
  );
  if (exRows.length === 0) throw Object.assign(new Error('Exercise not found'), { status: 404 });

  const exercise = exRows[0];
  const correctAnswer = exercise.content?.target || exercise.content?.correct_answer || exercise.content?.answer;

  // Determine correctness
  const isCorrect = checkAnswer(userAnswer, correctAnswer, exercise.content);

  // Get current order
  const { rows: orderRows } = await query(
    'SELECT COALESCE(MAX(exercise_order), 0) AS max_order FROM practice_session_exercises WHERE session_id = $1',
    [sessionId]
  );
  const nextOrder = orderRows[0].max_order + 1;

  // Store the answer
  await query(
    `INSERT INTO practice_session_exercises (id, session_id, exercise_id, user_answer, is_correct, score, duration_seconds, exercise_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [uuid(), sessionId, exerciseId, userAnswer, isCorrect, isCorrect ? 10 : 0, durationSeconds || 0, nextOrder]
  );

  // Update student state
  const state = await getStudentState(userId);
  let newConsecutiveCorrect = isCorrect ? state.consecutive_correct + 1 : 0;
  let newConsecutiveWrong = isCorrect ? 0 : state.consecutive_wrong + 1;

  await query(
    `UPDATE student_practice_state SET
       total_exercises = total_exercises + 1,
       total_correct = total_correct + $2,
       consecutive_correct = $3,
       consecutive_wrong = $4,
       updated_at = NOW()
     WHERE user_id = $1`,
    [userId, isCorrect ? 1 : 0, newConsecutiveCorrect, newConsecutiveWrong]
  );

  // Track errors for weakness analysis
  if (!isCorrect) {
    await query(
      `INSERT INTO student_errors (id, user_id, exercise_id, error_type, created_at)
       VALUES (uuid_generate_v4(), $1, $2, $3, NOW())`,
      [userId, exerciseId, exercise.type]
    );
  }

  // Update spaced repetition
  await spacedRepetition.updateRepetition(userId, exerciseId, isCorrect);

  // Check for level change
  const levelChange = await checkLevelChange(userId, newConsecutiveCorrect, newConsecutiveWrong, state.current_level);

  // Generate AI feedback if wrong
  let feedback = null;
  if (!isCorrect) {
    const ldType = await getStudentLDType(userId);
    feedback = await generateWrongAnswerFeedback({
      questionText: exercise.title + ': ' + (exercise.instructions || ''),
      studentAnswer: userAnswer,
      correctAnswer: correctAnswer || 'See explanation',
      questionType: exercise.type,
      studentAge: 8, // TODO: get from user profile
      ldType,
    });
  }

  return {
    isCorrect,
    correctAnswer: isCorrect ? null : correctAnswer,
    feedback,
    streak: newConsecutiveCorrect,
    levelChange,
    progress: {
      current: nextOrder,
      total: SESSION_EXERCISE_COUNT,
    },
  };
}

/**
 * Check if the answer is correct.
 * Handles various content structures and fuzzy matching.
 */
function checkAnswer(userAnswer, correctAnswer, content) {
  if (!correctAnswer && !content) return false;

  const studentAns = String(userAnswer).trim().toLowerCase();

  // If content has explicit correct_answer
  if (content?.correct_answer) {
    return studentAns === String(content.correct_answer).trim().toLowerCase();
  }

  // If content has target (e.g., letter recognition)
  if (content?.target) {
    return studentAns === String(content.target).trim().toLowerCase();
  }

  // If content has answer field
  if (content?.answer) {
    return studentAns === String(content.answer).trim().toLowerCase();
  }

  // For sequencing: compare arrays
  if (content?.correct_order) {
    const correctOrder = content.correct_order.join(',').toLowerCase();
    return studentAns === correctOrder;
  }

  // Fallback: direct comparison
  if (correctAnswer) {
    return studentAns === String(correctAnswer).trim().toLowerCase();
  }

  return false;
}

/**
 * Check if student should level up or down.
 */
async function checkLevelChange(userId, consecutiveCorrect, consecutiveWrong, currentLevel) {
  let newLevel = currentLevel;
  let direction = null;

  if (consecutiveCorrect >= LEVEL_UP_THRESHOLD && currentLevel < MAX_LEVEL) {
    newLevel = currentLevel + 1;
    direction = 'up';
  } else if (consecutiveWrong >= LEVEL_DOWN_THRESHOLD && currentLevel > MIN_LEVEL) {
    newLevel = currentLevel - 1;
    direction = 'down';
  }

  if (direction) {
    // Update level
    await query(
      `UPDATE student_practice_state SET
         current_level = $2,
         consecutive_correct = 0,
         consecutive_wrong = 0,
         updated_at = NOW()
       WHERE user_id = $1`,
      [userId, newLevel]
    );

    // Record level history
    await query(
      `INSERT INTO level_history (id, user_id, from_level, to_level, trigger, created_at)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, NOW())
       ON CONFLICT DO NOTHING`,
      [userId, currentLevel, newLevel, direction === 'up' ? 'consecutive_correct' : 'consecutive_wrong']
    );

    return { levelChanged: true, direction, fromLevel: currentLevel, toLevel: newLevel };
  }

  return { levelChanged: false };
}

// ─── Complete a practice session ──────────────────────────────────
async function completeSession(sessionId, userId) {
  // Get session stats
  const { rows: answers } = await query(
    'SELECT is_correct, duration_seconds FROM practice_session_exercises WHERE session_id = $1',
    [sessionId]
  );

  const totalExercises = answers.length;
  const totalCorrect = answers.filter(a => a.is_correct).length;
  const totalDuration = answers.reduce((sum, a) => sum + (a.duration_seconds || 0), 0);
  const accuracy = totalExercises > 0 ? Math.round((totalCorrect / totalExercises) * 100) : 0;

  const state = await getStudentState(userId);

  // Update session record
  await query(
    `UPDATE practice_sessions SET
       status = 'completed',
       completed_at = NOW(),
       duration_minutes = $2,
       level_at_end = $3,
       exercises_total = $4,
       exercises_correct = $5
     WHERE id = $1`,
    [sessionId, Math.round(totalDuration / 60), state.current_level, totalExercises, totalCorrect]
  );

  // Update streak
  const streakResult = await updateStreak(userId);

  // Update total sessions
  await query(
    `UPDATE student_practice_state SET
       total_sessions = total_sessions + 1,
       last_practice_at = NOW(),
       updated_at = NOW()
     WHERE user_id = $1`,
    [userId]
  );

  // Calculate updated mastery
  const mastery = await calculateMastery(userId);

  // Update mastery data in state
  await query(
    'UPDATE student_practice_state SET mastery_data = $2 WHERE user_id = $1',
    [userId, JSON.stringify(mastery)]
  );

  return {
    sessionId,
    totalExercises,
    totalCorrect,
    accuracy,
    durationMinutes: Math.round(totalDuration / 60),
    level: state.current_level,
    streak: streakResult.streak,
    mastery,
  };
}

// ─── Streak management ────────────────────────────────────────────
async function updateStreak(userId) {
  const state = await getStudentState(userId);
  const lastPractice = state.last_practice_at;
  const now = new Date();

  let newStreak = state.streak_count;

  if (!lastPractice) {
    // First ever session
    newStreak = 1;
  } else {
    const lastDate = new Date(lastPractice);
    const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Already practiced today — no streak change
    } else if (diffDays === 1) {
      // Consecutive day — increment streak
      newStreak = state.streak_count + 1;
    } else {
      // Missed a day — reset streak
      newStreak = 1;
    }
  }

  const longestStreak = Math.max(newStreak, state.longest_streak || 0);

  await query(
    `UPDATE student_practice_state SET
       streak_count = $2,
       longest_streak = $3,
       updated_at = NOW()
     WHERE user_id = $1`,
    [userId, newStreak, longestStreak]
  );

  return { streak: newStreak, longestStreak };
}

// ─── Get student progress ─────────────────────────────────────────
async function getProgress(userId) {
  const state = await getStudentState(userId);
  const ldType = await getStudentLDType(userId);
  const mastery = await calculateMastery(userId);
  const dueCount = await spacedRepetition.getDueCount(userId);

  const accuracy = state.total_exercises > 0
    ? Math.round((state.total_correct / state.total_exercises) * 100)
    : 0;

  return {
    level: state.current_level,
    streak: state.streak_count,
    longestStreak: state.longest_streak,
    totalSessions: state.total_sessions,
    totalExercises: state.total_exercises,
    totalCorrect: state.total_correct,
    accuracy,
    mastery,
    ldType,
    lastPracticeAt: state.last_practice_at,
    reviewDue: dueCount,
  };
}

// ─── Get practice history ─────────────────────────────────────────
async function getHistory(userId, limit = 20) {
  const { rows } = await query(
    `SELECT id, session_type, status, duration_minutes, level_at_start, level_at_end,
            exercises_total, exercises_correct, completed_at, created_at
     FROM practice_sessions
     WHERE user_id = $1 AND status = 'completed'
     ORDER BY completed_at DESC
     LIMIT $2`,
    [userId, limit]
  );

  return rows.map(r => ({
    ...r,
    accuracy: r.exercises_total > 0 ? Math.round((r.exercises_correct / r.exercises_total) * 100) : 0,
  }));
}

// ─── Get streak info ──────────────────────────────────────────────
async function getStreak(userId) {
  const state = await getStudentState(userId);

  // Get last 7 days of practice
  const { rows: recentDays } = await query(
    `SELECT DATE(completed_at) AS day
     FROM practice_sessions
     WHERE user_id = $1 AND status = 'completed'
       AND completed_at > NOW() - INTERVAL '7 days'
     GROUP BY DATE(completed_at)
     ORDER BY day DESC`,
    [userId]
  );

  const last7Days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    last7Days.push({
      date: dateStr,
      practiced: recentDays.some(r => r.day.toISOString().split('T')[0] === dateStr),
    });
  }

  return {
    current: state.streak_count,
    longest: state.longest_streak,
    last7Days,
  };
}

// ─── Calculate mastery per category ───────────────────────────────
async function calculateMastery(userId) {
  const { rows } = await query(
    `SELECT e.type,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE pse.is_correct) AS correct
     FROM practice_session_exercises pse
     JOIN exercises e ON e.id = pse.exercise_id
     JOIN practice_sessions ps ON ps.id = pse.session_id
     WHERE ps.user_id = $1
       AND ps.status = 'completed'
       AND pse.created_at > NOW() - INTERVAL '60 days'
     GROUP BY e.type`,
    [userId]
  );

  const mastery = {};
  for (const row of rows) {
    mastery[row.type] = {
      total: parseInt(row.total, 10),
      correct: parseInt(row.correct, 10),
      percentage: Math.round((parseInt(row.correct, 10) / parseInt(row.total, 10)) * 100),
    };
  }
  return mastery;
}

module.exports = {
  startSession,
  getNextExercise,
  submitAnswer,
  completeSession,
  getProgress,
  getHistory,
  getStreak,
  calculateMastery,
  getStudentState,
  getStudentLDType,
  selectExercises,
};
