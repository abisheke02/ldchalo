const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../../config/database');
const { requireAuth } = require('../../middleware/auth');

// Conversations list
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT DISTINCT ON (partner_id)
              partner_id,
              partner_name,
              last_message,
              last_at,
              unread
       FROM (
         SELECT
           CASE WHEN m.sender_id=$1 THEN m.receiver_id ELSE m.sender_id END AS partner_id,
           u.name AS partner_name,
           m.body AS last_message,
           m.created_at AS last_at,
           SUM(CASE WHEN m.receiver_id=$1 AND m.is_read=FALSE THEN 1 ELSE 0 END)
             OVER (PARTITION BY CASE WHEN m.sender_id=$1 THEN m.receiver_id ELSE m.sender_id END) AS unread
         FROM messages m
         JOIN users u ON u.id = (CASE WHEN m.sender_id=$1 THEN m.receiver_id ELSE m.sender_id END)
         WHERE m.sender_id=$1 OR m.receiver_id=$1
         ORDER BY m.created_at DESC
       ) sub
       ORDER BY partner_id, last_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Thread with partner
router.get('/:partnerId', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM messages
       WHERE (sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1)
       ORDER BY created_at ASC LIMIT 100`,
      [req.user.id, req.params.partnerId]
    );
    await query(
      'UPDATE messages SET is_read=TRUE WHERE receiver_id=$1 AND sender_id=$2',
      [req.user.id, req.params.partnerId]
    );
    res.json({ messages: rows });
  } catch (err) { next(err); }
});

// Send message
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { receiverId, body } = req.body;
    if (!receiverId || !body?.trim()) return res.status(400).json({ error: 'receiverId and body required' });

    const { rows } = await query(
      `INSERT INTO messages (id, sender_id, receiver_id, body)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [uuid(), req.user.id, receiverId, body.trim()]
    );
    res.status(201).json({ message: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
