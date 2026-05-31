const cron = require('node-cron');
const { query } = require('../config/database');

// Reset daily streaks for inactive students
async function resetInactiveStreaks() {
  const { rowCount } = await query(
    `UPDATE students SET streak_count=0
     WHERE last_activity_at < CURRENT_DATE - INTERVAL '1 day'
       AND streak_count > 0`
  );
  console.log(`[Cron] Reset streaks for ${rowCount} inactive students`);
}

// Flag students due for re-screening (every 90 days)
async function flagRescreening() {
  const { rowCount } = await query(
    `UPDATE students SET last_screened_at=NULL
     WHERE last_screened_at < NOW() - INTERVAL '90 days'
       AND last_screened_at IS NOT NULL`
  );
  console.log(`[Cron] Flagged ${rowCount} students for re-screening`);
}

// Weekly AI recommendations (lightweight)
async function generateWeeklyRecommendations() {
  const { rows } = await query(
    `SELECT s.user_id, s.ld_type, s.ld_risk_score, s.current_level, u.name
     FROM students s JOIN users u ON u.id = s.user_id
     WHERE s.ld_type IS NOT NULL
       AND s.user_id NOT IN (
         SELECT user_id FROM ai_recommendations WHERE created_at > NOW() - INTERVAL '7 days'
       )
     LIMIT 50`
  );
  console.log(`[Cron] Would generate recommendations for ${rows.length} students`);
}

function startCronJobs() {
  // Every day at 01:00
  cron.schedule('0 1 * * *', () => resetInactiveStreaks().catch(console.error));
  // Every Sunday at 02:00
  cron.schedule('0 2 * * 0', () => flagRescreening().catch(console.error));
  // Every Monday at 06:00
  cron.schedule('0 6 * * 1', () => generateWeeklyRecommendations().catch(console.error));
  console.log('[Cron] Jobs scheduled');
}

module.exports = { startCronJobs, resetInactiveStreaks, flagRescreening, generateWeeklyRecommendations };
