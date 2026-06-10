/**
 * Screening Service — Business logic for LD screening quiz sessions.
 */

const { v4: uuid } = require('uuid');
const { query } = require('../config/database');
const { classifyLD } = require('./ldClassifier');

/**
 * Start a new screening session for a user.
 */
async function startSession(userId) {
  const id = uuid();
  await query(
    `INSERT INTO screening_sessions (id, user_id, status, created_at)
     VALUES ($1, $2, 'in_progress', NOW())`,
    [id, userId]
  );
  return { sessionId: id };
}

/**
 * Submit an answer for a screening question.
 * Stores in a session_answers table (or JSONB column).
 */
async function submitAnswer(sessionId, questionId, answer, timeSpentMs) {
  // Check session exists and is in progress
  const { rows } = await query(
    'SELECT id, status FROM screening_sessions WHERE id = $1',
    [sessionId]
  );
  if (!rows[0]) throw Object.assign(new Error('Session not found'), { status: 404 });
  if (rows[0].status !== 'in_progress') throw Object.assign(new Error('Session already completed'), { status: 400 });

  // Get the correct answer for scoring
  const { rows: qRows } = await query(
    'SELECT correct_answer, category, question_text FROM screening_questions WHERE id = $1',
    [questionId]
  );
  const question = qRows[0];
  if (!question) throw Object.assign(new Error('Question not found'), { status: 404 });

  const isCorrect = answer === question.correct_answer;

  // Store answer (use a screening_answers table or upsert into session data)
  await query(
    `INSERT INTO screening_answers (id, session_id, question_id, student_answer, is_correct, response_time_ms, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (session_id, question_id) DO UPDATE SET
       student_answer = EXCLUDED.student_answer,
       is_correct = EXCLUDED.is_correct,
       response_time_ms = EXCLUDED.response_time_ms`,
    [uuid(), sessionId, questionId, answer, isCorrect, timeSpentMs || 0]
  );

  return { isCorrect, questionId };
}

/**
 * Complete a screening session — triggers AI classification.
 */
async function completeSession(sessionId) {
  // Get all answers with question data
  const { rows: answers } = await query(
    `SELECT sa.student_answer, sa.is_correct, sa.response_time_ms,
            sq.question_text, sq.correct_answer, sq.category, sq.question_type
     FROM screening_answers sa
     JOIN screening_questions sq ON sq.id = sa.question_id
     WHERE sa.session_id = $1
     ORDER BY sq.order_index`,
    [sessionId]
  );

  if (answers.length === 0) {
    throw Object.assign(new Error('No answers found for this session'), { status: 400 });
  }

  // Prepare data for classifier
  const classifierInput = answers.map(a => ({
    questionText: a.question_text,
    category: a.category,
    studentAnswer: a.student_answer,
    correctAnswer: a.correct_answer,
    isCorrect: a.is_correct,
    responseTimeMs: a.response_time_ms,
  }));

  // Run AI classification
  const result = await classifyLD(classifierInput);

  // Update session with results
  await query(
    `UPDATE screening_sessions
     SET status = 'completed',
         ld_type_detected = $1,
         risk_score = $2,
         completed_at = NOW()
     WHERE id = $3`,
    [result.ldType, result.riskScore, sessionId]
  );

  // Store detailed result as JSONB (for breakdown + recommendations)
  await query(
    `UPDATE screening_sessions
     SET result_data = $1
     WHERE id = $2`,
    [JSON.stringify(result), sessionId]
  );

  return result;
}

/**
 * Get screening result for a session.
 */
async function getResult(sessionId) {
  const { rows } = await query(
    `SELECT id, user_id, status, ld_type_detected, risk_score, result_data, completed_at, created_at
     FROM screening_sessions WHERE id = $1`,
    [sessionId]
  );

  if (!rows[0]) throw Object.assign(new Error('Session not found'), { status: 404 });

  const session = rows[0];
  const resultData = session.result_data ? (typeof session.result_data === 'string' ? JSON.parse(session.result_data) : session.result_data) : null;

  return {
    sessionId: session.id,
    status: session.status,
    ldType: session.ld_type_detected,
    riskScore: session.risk_score,
    breakdown: resultData?.breakdown || null,
    recommendations: resultData?.recommendations || [],
    reasoning: resultData?.reasoning || '',
    classifiedBy: resultData?.classifiedBy || 'unknown',
    completedAt: session.completed_at,
    createdAt: session.created_at,
  };
}

/**
 * Get screening history for a user.
 */
async function getHistory(userId) {
  const { rows } = await query(
    `SELECT id, status, ld_type_detected, risk_score, completed_at, created_at
     FROM screening_sessions
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return rows.map(r => ({
    sessionId: r.id,
    status: r.status,
    ldType: r.ld_type_detected,
    riskScore: r.risk_score,
    completedAt: r.completed_at,
    createdAt: r.created_at,
  }));
}

module.exports = { startSession, submitAnswer, completeSession, getResult, getHistory };
