/**
 * Test Engine Service
 * Handles level-up tests: start, submit, complete, certify
 */
const { v4: uuid } = require('uuid');
const testQuestions = require('../data/testQuestions');

const TIME_LIMITS = { 1: 600, 2: 720, 3: 900, 4: 1080, 5: 1200 }; // seconds
const PASS_THRESHOLD = 80; // percent
const MAX_ATTEMPTS_PER_DAY = 3;
const QUESTIONS_PER_TEST = 10;

class TestEngine {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get available test for a student
   */
  async getAvailableTest(userId) {
    // Get student's current level from practice state
    const state = await this.db.query(
      'SELECT current_level FROM student_practice_state WHERE user_id = $1',
      [userId]
    );
    const currentLevel = state.rows[0]?.current_level || 1;

    // Count today's attempts
    const today = new Date().toISOString().split('T')[0];
    const attempts = await this.db.query(
      'SELECT COUNT(*) FROM test_attempts WHERE user_id = $1 AND level = $2 AND DATE(started_at) = $3',
      [userId, currentLevel, today]
    );
    const attemptsToday = parseInt(attempts.rows[0]?.count || '0');

    return {
      level: currentLevel,
      questionsCount: QUESTIONS_PER_TEST,
      timeLimit: TIME_LIMITS[currentLevel],
      timeLimitLabel: `${Math.floor(TIME_LIMITS[currentLevel] / 60)} minutes`,
      attemptsToday,
      maxAttempts: MAX_ATTEMPTS_PER_DAY,
      passThreshold: PASS_THRESHOLD,
      isLocked: attemptsToday >= MAX_ATTEMPTS_PER_DAY,
    };
  }

  /**
   * Start a test — creates attempt and returns questions
   */
  async startTest(userId, level) {
    // Check attempts limit
    const today = new Date().toISOString().split('T')[0];
    const attempts = await this.db.query(
      'SELECT COUNT(*) FROM test_attempts WHERE user_id = $1 AND level = $2 AND DATE(started_at) = $3',
      [userId, level, today]
    );
    if (parseInt(attempts.rows[0]?.count || '0') >= MAX_ATTEMPTS_PER_DAY) {
      throw new Error('Maximum attempts reached for today');
    }

    // Get questions for this level
    const questions = testQuestions
      .filter(q => q.level === level)
      .sort(() => Math.random() - 0.5) // shuffle
      .slice(0, QUESTIONS_PER_TEST)
      .map((q, i) => ({ ...q, id: `tq-${level}-${i + 1}` }));

    // Create attempt record
    const attemptId = uuid();
    await this.db.query(
      'INSERT INTO test_attempts (id, user_id, level, started_at, status) VALUES ($1, $2, $3, NOW(), $4)',
      [attemptId, userId, level, 'in_progress']
    );

    return {
      attemptId,
      level,
      questions: questions.map(q => ({ id: q.id, question_text: q.question_text, question_type: q.question_type, options: q.options })),
      timeLimit: TIME_LIMITS[level],
      questionsCount: questions.length,
    };
  }

  /**
   * Submit an answer during a test
   */
  async submitAnswer(attemptId, questionId, answer) {
    const attempt = await this.db.query('SELECT * FROM test_attempts WHERE id = $1', [attemptId]);
    if (!attempt.rows[0] || attempt.rows[0].status !== 'in_progress') {
      throw new Error('Test not in progress');
    }

    const level = attempt.rows[0].level;
    const allQ = testQuestions.filter(q => q.level === level);
    const idx = parseInt(questionId.split('-')[2]) - 1;
    const question = allQ[idx];
    const isCorrect = question ? String(answer).trim() === String(question.correct_answer).trim() : false;

    // Store answer (in real app, would be a separate table)
    await this.db.query(
      `UPDATE test_attempts SET answers = COALESCE(answers, '[]'::jsonb) || $1::jsonb WHERE id = $2`,
      [JSON.stringify([{ questionId, answer, isCorrect, correct_answer: question?.correct_answer, question_text: question?.question_text }]), attemptId]
    );

    return { received: true };
  }

  /**
   * Complete a test — score + pass/fail + optional level-up
   */
  async completeTest(attemptId) {
    const attempt = await this.db.query('SELECT * FROM test_attempts WHERE id = $1', [attemptId]);
    if (!attempt.rows[0]) throw new Error('Attempt not found');

    const { user_id, level, answers } = attempt.rows[0];
    const parsedAnswers = answers || [];
    const correct = parsedAnswers.filter(a => a.isCorrect).length;
    const total = parsedAnswers.length || QUESTIONS_PER_TEST;
    const score = Math.round((correct / total) * 100);
    const passed = score >= PASS_THRESHOLD;

    // Update attempt
    await this.db.query(
      'UPDATE test_attempts SET status = $1, score = $2, passed = $3, completed_at = NOW() WHERE id = $4',
      [passed ? 'passed' : 'failed', score, passed, attemptId]
    );

    // If passed, advance level
    let certificate = null;
    if (passed) {
      await this.db.query(
        'UPDATE student_practice_state SET current_level = GREATEST(current_level, $1 + 1), updated_at = NOW() WHERE user_id = $2',
        [level, user_id]
      );
      await this.db.query(
        'INSERT INTO level_history (id, user_id, level, passed, score, tested_at) VALUES ($1, $2, $3, $4, $5, NOW())',
        [uuid(), user_id, level, true, score]
      );
      certificate = await this.generateCertificate(attemptId, user_id, level, score);
    }

    return {
      attemptId, level, score, correct, total, passed,
      wrongAnswers: parsedAnswers.filter(a => !a.isCorrect),
      certificate,
      message: passed ? `Congratulations! Level ${level} passed!` : `Need ${PASS_THRESHOLD}% to pass. Keep practicing!`,
    };
  }

  /**
   * Generate certificate data
   */
  async generateCertificate(attemptId, userId, level, score) {
    const user = await this.db.query('SELECT full_name FROM users WHERE id = $1', [userId]);
    return {
      id: 'CERT-' + uuid().slice(0, 8).toUpperCase(),
      attemptId,
      level,
      score,
      date: new Date().toISOString(),
      studentName: user.rows[0]?.full_name || 'Student',
      schoolName: 'LD Schools',
    };
  }

  /**
   * Get test history for a student
   */
  async getHistory(userId) {
    const result = await this.db.query(
      'SELECT id, level, score, passed, completed_at as date FROM test_attempts WHERE user_id = $1 AND status != $2 ORDER BY completed_at DESC LIMIT 20',
      [userId, 'in_progress']
    );
    return { attempts: result.rows };
  }

  /**
   * Get certificate for a passed attempt
   */
  async getCertificate(attemptId) {
    const attempt = await this.db.query(
      `SELECT ta.*, u.full_name FROM test_attempts ta JOIN users u ON u.id = ta.user_id WHERE ta.id = $1 AND ta.passed = true`,
      [attemptId]
    );
    if (!attempt.rows[0]) throw new Error('Certificate not found');
    const { level, score, completed_at, full_name } = attempt.rows[0];
    return { id: attemptId, level, score, date: completed_at, studentName: full_name, schoolName: 'LD Schools' };
  }
}

module.exports = TestEngine;
