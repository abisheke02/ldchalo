const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../../config/database');
const { requireAuth, requireRole } = require('../../middleware/auth');

const staff = [requireAuth, requireRole('teacher', 'school_admin')];

// Circulars
router.get('/circulars', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT c.*, u.name AS created_by_name FROM circulars c JOIN users u ON u.id = c.created_by WHERE c.school_id=$1 ORDER BY c.created_at DESC LIMIT 20',
      [req.user.schoolId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/circulars', ...staff, async (req, res, next) => {
  try {
    const { title, body, audience = 'all' } = req.body;
    const { rows } = await query(
      `INSERT INTO circulars (id, school_id, title, body, audience, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [uuid(), req.user.schoolId, title, body, audience, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// Notifications
router.get('/notifications', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30',
      [req.user.id]
    );
    res.json({ notifications: rows });
  } catch (err) { next(err); }
});

router.patch('/notifications/:id/read', requireAuth, async (req, res, next) => {
  try {
    await query('UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/notifications/mark-all-read', requireAuth, async (req, res, next) => {
  try {
    await query('UPDATE notifications SET is_read=TRUE WHERE user_id=$1', [req.user.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// AI rephrase
router.post('/ai/rephrase', ...staff, async (req, res, next) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'AI not configured' });
    const Anthropic = require('@anthropic-ai/sdk');
    const client    = new Anthropic.default();
    const { text, tone = 'professional' } = req.body;
    const msg = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages:   [{ role: 'user', content: `Rephrase the following school communication in a ${tone} tone:\n\n${text}` }],
    });
    res.json({ rephrased: msg.content[0].text });
  } catch (err) { next(err); }
});

module.exports = router;
