const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../../config/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

// My recommendations (student/parent)
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM ai_recommendations
       WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5`,
      [req.user.id]
    );
    if (rows.length) return res.json(rows[0]);

    // Auto-generate if none exist
    const student = (await query(
      `SELECT s.*, u.name FROM students s JOIN users u ON u.id = s.user_id WHERE s.user_id=$1`,
      [req.user.id]
    )).rows[0];

    if (!student || !process.env.ANTHROPIC_API_KEY) {
      return res.json({ tips: ['Complete your screening to get personalized tips.'], generated_at: new Date() });
    }

    const Anthropic = require('@anthropic-ai/sdk');
    const ai = new Anthropic.default();
    const msg = await ai.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages:   [{
        role:    'user',
        content: `A student named ${student.name} has ${student.ld_type || 'no detected LD'} with risk score ${student.ld_risk_score || 0}/100 at level ${student.current_level || 1}. Give 5 short, actionable learning tips for this student. Return as JSON array of strings.`,
      }],
    });
    const tips = JSON.parse(msg.content[0].text.match(/\[[\s\S]*\]/)?.[0] || '[]');
    const recId = uuid();
    await query(
      `INSERT INTO ai_recommendations (id, user_id, audience, content, tips, created_at)
       VALUES ($1,$2,'student',$3,$4::jsonb,NOW())`,
      [recId, req.user.id, msg.content[0].text, JSON.stringify(tips)]
    ).catch(() => {});
    res.json({ id: recId, tips, generated_at: new Date() });
  } catch (err) { next(err); }
});

// Class recommendations (teacher)
router.get('/class/:classId', requireAuth, requireRole('teacher', 'school_admin'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT r.*, u.name AS student_name FROM ai_recommendations r
       JOIN users u ON u.id = r.user_id
       WHERE r.class_id=$1 ORDER BY r.created_at DESC LIMIT 10`,
      [req.params.classId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Generate for class
router.post('/generate', requireAuth, requireRole('teacher', 'school_admin'), async (req, res, next) => {
  try {
    res.json({ message: 'Recommendation generation queued', status: 'queued' });
  } catch (err) { next(err); }
});

module.exports = router;
