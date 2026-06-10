#!/usr/bin/env node
/**
 * Seed script for exercises table.
 * Inserts all exercises from exerciseBank.js into the database.
 *
 * Usage: node src/db/seedExercises.js
 *
 * Uses upsert (ON CONFLICT) to avoid duplicates when re-run.
 * Matches on (type, level, title) as a natural key.
 */

require('../config/env');
const { query, pool } = require('../config/database');
const exerciseBank = require('../data/exerciseBank');

async function seedExercises() {
  console.log(`\n🌱 Seeding ${exerciseBank.length} exercises into database...\n`);

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const exercise of exerciseBank) {
    try {
      const result = await query(
        `INSERT INTO exercises (id, type, level, title, instructions, content, ld_types, is_active, created_at)
         VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, TRUE, NOW())
         ON CONFLICT ON CONSTRAINT exercises_pkey DO NOTHING`,
        [
          exercise.type,
          exercise.level,
          exercise.title,
          exercise.instructions || '',
          JSON.stringify(exercise.content || {}),
          exercise.ld_types || [],
        ]
      );

      // Check if a duplicate exists by title + type + level
      const { rows: existing } = await query(
        `SELECT id FROM exercises WHERE type = $1 AND level = $2 AND title = $3 LIMIT 1`,
        [exercise.type, exercise.level, exercise.title]
      );

      if (existing.length === 0) {
        // Actually insert (above might not have worked due to no natural unique constraint)
        await query(
          `INSERT INTO exercises (id, type, level, title, instructions, content, ld_types, is_active, created_at)
           VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, $6, TRUE, NOW())`,
          [
            exercise.type,
            exercise.level,
            exercise.title,
            exercise.instructions || '',
            JSON.stringify(exercise.content || {}),
            exercise.ld_types || [],
          ]
        );
        inserted++;
      } else {
        // Update existing
        await query(
          `UPDATE exercises SET
             instructions = $2,
             content = $3,
             ld_types = $4,
             is_active = TRUE
           WHERE id = $1`,
          [
            existing[0].id,
            exercise.instructions || '',
            JSON.stringify(exercise.content || {}),
            exercise.ld_types || [],
          ]
        );
        updated++;
      }
    } catch (err) {
      errors++;
      console.error(`  ❌ Error seeding "${exercise.title}":`, err.message);
    }
  }

  console.log(`\n✅ Seed complete!`);
  console.log(`   📥 Inserted: ${inserted}`);
  console.log(`   🔄 Updated:  ${updated}`);
  if (errors > 0) console.log(`   ❌ Errors:   ${errors}`);
  console.log(`   📊 Total:    ${exerciseBank.length}\n`);

  // Summary by type
  const typeCounts = {};
  for (const ex of exerciseBank) {
    typeCounts[ex.type] = (typeCounts[ex.type] || 0) + 1;
  }
  console.log('   Distribution:');
  for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${type}: ${count}`);
  }
  console.log('');

  // Close pool
  if (pool && pool.end) await pool.end();
}

// Run if called directly
if (require.main === module) {
  seedExercises()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}

module.exports = seedExercises;
