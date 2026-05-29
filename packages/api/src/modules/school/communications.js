const router = require('express').Router();
const { pool } = require('../../config/database');
const { authenticate, authorize } = require('../../middleware/auth');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// GET all circulars
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, u.name AS created_by_name FROM circulars c
       JOIN users u ON u.id = c.created_by
       WHERE c.school_id = $1 ORDER BY c.created_at DESC`,
      [req.user.school_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST create circular with AI rephrase
router.post('/', authenticate, authorize('teacher', 'school_admin', 'principal'), async (req, res, next) => {
  try {
    const { title, body, audience, class_ids, category } = req.body;

    // AI Communication Assistant â€” rephrase text professionally
    let ai_rephrased_body = null;
    if (body && process.env.ANTHROPIC_API_KEY) {
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: `Rephrase the following school circular/notice professionally and clearly for parents. Keep it concise and friendly:\n\n"${body}"`
        }]
      });
      ai_rephrased_body = msg.content[0].text;
    }

    const { rows: [circular] } = await pool.query(
      `INSERT INTO circulars (school_id, title, body, ai_rephrased_body, audience, class_ids, category, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.school_id, title, body, ai_rephrased_body, audience || 'all', class_ids, category, req.user.sub]
    );
    res.status(201).json(circular);
  } catch (err) { next(err); }
});

// POST publish circular (send FCM/WhatsApp)
router.post('/:id/publish', authenticate, authorize('school_admin', 'principal'), async (req, res, next) => {
  try {
    const { rows: [circular] } = await pool.query(
      `UPDATE circulars SET is_published=true, published_at=NOW() WHERE id=$1 AND school_id=$2 RETURNING *`,
      [req.params.id, req.user.school_id]
    );
    // TODO: FCM push notification to target audience
    // TODO: WhatsApp message via Cloud API
    res.json({ message: 'Circular published', circular });
  } catch (err) { next(err); }
});

// POST rephrase any text (AI Communication Assistant standalone)
router.post('/ai/rephrase', authenticate, async (req, res, next) => {
  try {
    const { text, type } = req.body; // type: homework / assignment / circular / remark
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Rephrase the following ${type || 'school notice'} professionally for parents. Keep it clear and concise:\n\n"${text}"`
      }]
    });
    res.json({ original: text, rephrased: msg.content[0].text });
  } catch (err) { next(err); }
});

module.exports = router;
