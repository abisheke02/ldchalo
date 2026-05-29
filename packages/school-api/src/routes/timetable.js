const router = require('express').Router();
const { pool } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// GET timetable for a class
router.get('/:class_id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ts.*, sub.name AS subject_name, u.name AS teacher_name
       FROM timetable_slots ts
       LEFT JOIN subjects sub ON sub.id = ts.subject_id
       LEFT JOIN staff st ON st.id = ts.staff_id
       LEFT JOIN users u ON u.id = st.user_id
       WHERE ts.class_id = $1
       ORDER BY ts.day_of_week, ts.period_number`,
      [req.params.class_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST auto-generate timetable using AI (Claude)
router.post('/generate', authenticate, authorize('principal', 'school_admin'), async (req, res, next) => {
  try {
    const { academic_year_id, class_ids } = req.body;

    // Fetch all rules for the classes
    const { rows: rules } = await pool.query(
      `SELECT tr.*, sub.name AS subject, u.name AS teacher, tr.periods_per_week
       FROM timetable_rules tr
       JOIN subjects sub ON sub.id = tr.subject_id
       JOIN staff st ON st.id = tr.staff_id
       JOIN users u ON u.id = st.user_id
       WHERE tr.academic_year_id = $1 AND tr.class_id = ANY($2::uuid[])`,
      [academic_year_id, class_ids]
    );

    // Ask Claude to generate a conflict-free timetable
    const prompt = `You are a school timetable generator. Given the following teacher-subject-class rules, generate a weekly timetable (Mon–Fri, 8 periods/day) with NO conflicts (same teacher in two classes at the same time).

Rules:
${JSON.stringify(rules, null, 2)}

Return a JSON array of slots: { class_id, day_of_week (1=Mon), period_number, subject_id, staff_id }
Ensure each teacher teaches at most one class per period. Distribute periods evenly across the week.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0].text;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return res.status(500).json({ error: 'AI could not generate timetable' });

    const slots = JSON.parse(jsonMatch[0]);

    // Save to DB
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const slot of slots) {
        await client.query(
          `INSERT INTO timetable_slots (school_id, academic_year_id, class_id, day_of_week, period_number, subject_id, staff_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (class_id, day_of_week, period_number) DO UPDATE
           SET subject_id = EXCLUDED.subject_id, staff_id = EXCLUDED.staff_id`,
          [req.user.school_id, academic_year_id, slot.class_id, slot.day_of_week, slot.period_number, slot.subject_id, slot.staff_id]
        );
      }
      await client.query('COMMIT');
    } catch (err) { await client.query('ROLLBACK'); throw err; }
    finally { client.release(); }

    res.json({ generated: slots.length, slots });
  } catch (err) { next(err); }
});

// POST handle substitution when teacher is absent
router.post('/substitution', authenticate, authorize('principal', 'school_admin'), async (req, res, next) => {
  try {
    const { absent_staff_id, date } = req.body;
    const dayOfWeek = new Date(date).getDay(); // 0=Sun, 1=Mon...

    // Find all slots for the absent teacher today
    const { rows: slots } = await pool.query(
      `SELECT * FROM timetable_slots WHERE staff_id = $1 AND day_of_week = $2`,
      [absent_staff_id, dayOfWeek]
    );

    // Find available substitute teachers (not busy in those periods)
    const substitutions = [];
    for (const slot of slots) {
      const { rows: available } = await pool.query(
        `SELECT st.id AS staff_id, u.name
         FROM staff st JOIN users u ON u.id = st.user_id
         WHERE st.school_id = $1
           AND st.id != $2
           AND st.id NOT IN (
             SELECT staff_id FROM timetable_slots
             WHERE day_of_week = $3 AND period_number = $4
           )
         LIMIT 1`,
        [req.user.school_id, absent_staff_id, dayOfWeek, slot.period_number]
      );
      if (available.length) {
        await pool.query(
          `INSERT INTO timetable_substitutions (school_id, timetable_slot_id, date, original_staff_id, substitute_staff_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [req.user.school_id, slot.id, date, absent_staff_id, available[0].staff_id]
        );
        substitutions.push({ slot, substitute: available[0] });
      }
    }

    res.json({ date, substitutions_arranged: substitutions.length, substitutions });
  } catch (err) { next(err); }
});

module.exports = router;
