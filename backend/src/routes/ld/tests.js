const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');
const { generateWrongAnswerFeedback } = require('../../services/claudeService');

router.get('/levels', requireAuth, async (req, res, next) => {
  try {
    const student = (await query('SELECT current_level FROM students WHERE user_id=$1', [req.user.id])).rows[0];
    const current = student?.current_level || 1;
    const levels  = [1,2,3,4,5].map((l) => ({
      level:    l,
      label:    ['Starter','Basic','Intermediate','Advanced','Mastery'][l - 1],
      unlocked: l <= current,
    }));
    res.json(levels);
  } catch (err) { next(err); }
});

router.get('/questions', requireAuth, async (req, res, next) => {
  try {
    const level = parseInt(req.query.level) || 1;
    const { rows } = await query(
      `SELECT id, level, question_type, question_text, options, media_url, audio_url
       FROM test_questions WHERE level=$1 AND is_active=TRUE
       ORDER BY RANDOM() LIMIT 10`,
      [level]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/submit', requireAuth, async (req, res, next) => {
  try {
    const { level, answers, duration_seconds } = req.body;
    if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers[] required' });

    let correct = 0;
    const review = [];
    for (const a of answers) {
      const q = (await query(
        'SELECT question_text, question_type, correct_answer FROM test_questions WHERE id=$1',
        [a.question_id]
      )).rows[0];
      const isCorrect = !!q && String(q.correct_answer).toLowerCase() === String(a.answer).toLowerCase();
      if (isCorrect) correct++;
      review.push({ question_id: a.question_id, your_answer: a.answer, is_correct: isCorrect, q });
    }
    const score = Math.round((correct / answers.length) * 100);
    const passed = score >= 70;

    const attemptId = uuid();
    await query(
      `INSERT INTO test_attempts (id, user_id, level, score, passed, duration_seconds, answers)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [attemptId, req.user.id, level, score, passed, duration_seconds || 0, JSON.stringify(answers)]
    );

    if (passed) {
      await query(
        'UPDATE students SET current_level=LEAST(current_level+1,5) WHERE user_id=$1 AND current_level=$2',
        [req.user.id, level]
      );
      await query(
        `INSERT INTO level_history (id, user_id, from_level, to_level, trigger)
         VALUES ($1,$2,$3,$4,'test_pass') ON CONFLICT DO NOTHING`,
        [uuid(), req.user.id, level, Math.min(level + 1, 5)]
      );
    }

    // AI feedback on wrong answers (FR-05) — warm, simple explanation + memory hook
    const wrong = review.filter((r) => !r.is_correct && r.q);
    let student = null;
    if (wrong.length) {
      student = (await query('SELECT age, ld_type FROM students WHERE user_id=$1', [req.user.id])).rows[0];
    }
    await Promise.all(wrong.map(async (r) => {
      r.feedback = await generateWrongAnswerFeedback({
        questionText: r.q.question_text,
        studentAnswer: r.your_answer,
        correctAnswer: r.q.correct_answer,
        questionType: r.q.question_type,
        studentAge: student?.age,
        ldType: student?.ld_type,
      });
    }));

    const reviewOut = review.map((r) => ({
      question_id: r.question_id,
      question_text: r.q?.question_text,
      your_answer: r.your_answer,
      correct_answer: r.q?.correct_answer,
      is_correct: r.is_correct,
      feedback: r.feedback || null,
    }));

    res.json({ score, passed, correct, total: answers.length, attemptId, review: reviewOut });
  } catch (err) { next(err); }
});

router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM test_attempts WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
