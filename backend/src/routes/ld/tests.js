const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

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
    for (const a of answers) {
      const q = (await query('SELECT correct_answer FROM test_questions WHERE id=$1', [a.question_id])).rows[0];
      if (q && String(q.correct_answer).toLowerCase() === String(a.answer).toLowerCase()) correct++;
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

    res.json({ score, passed, correct, total: answers.length, attemptId });
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
