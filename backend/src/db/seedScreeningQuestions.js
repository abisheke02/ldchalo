/**
 * Seed screening questions into the database.
 * Run: node src/db/seedScreeningQuestions.js
 */

require('../config/env');
const { query, pool } = require('../config/database');
const { v4: uuid } = require('uuid');
const screeningQuestions = require('../data/screeningQuestions');

async function seed() {
  console.log(`[Seed] Inserting ${screeningQuestions.length} screening questions...`);

  let inserted = 0;
  let skipped = 0;

  for (const q of screeningQuestions) {
    try {
      const { rowCount } = await query(
        `INSERT INTO screening_questions (id, question_text, question_type, category, options, correct_answer, order_index, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
         ON CONFLICT (order_index) DO NOTHING`,
        [
          uuid(),
          q.question_text,
          q.question_type,
          q.category,
          JSON.stringify(q.options),
          q.correct_answer,
          q.order_index,
        ]
      );
      if (rowCount > 0) inserted++;
      else skipped++;
    } catch (err) {
      // If order_index doesn't have a unique constraint, try without ON CONFLICT
      try {
        await query(
          `INSERT INTO screening_questions (id, question_text, question_type, category, options, correct_answer, order_index, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)`,
          [uuid(), q.question_text, q.question_type, q.category, JSON.stringify(q.options), q.correct_answer, q.order_index]
        );
        inserted++;
      } catch (innerErr) {
        console.error(`[Seed] Failed to insert question #${q.order_index}:`, innerErr.message);
        skipped++;
      }
    }
  }

  console.log(`[Seed] Done! Inserted: ${inserted}, Skipped: ${skipped}`);
  await pool.end();
  process.exit(0);
}

seed().catch(err => {
  console.error('[Seed] Fatal error:', err);
  process.exit(1);
});
