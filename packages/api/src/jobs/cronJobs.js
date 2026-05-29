const { query } = require('../config/database');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const safeJob = (name, fn) => async () => {
  try {
    await fn();
  } catch (err) {
    console.error(`[cron:${name}]`, err.message);
  }
};

// ─── Job definitions ──────────────────────────────────────────────────────────

// Mark students overdue for re-screening (runs daily at 02:00)
const flagRescreeningDue = safeJob('rescreening', async () => {
  const result = await query(`
    UPDATE students
    SET    next_screening_at = NOW() + INTERVAL '90 days'
    WHERE  last_screened_at IS NOT NULL
      AND  next_screening_at < NOW()
      AND  next_screening_at IS NOT NULL
    RETURNING id
  `);
  if (result.rowCount > 0)
    console.log(`[cron:rescreening] Flagged ${result.rowCount} students for re-screening`);
});

// Expire stale payment orders (runs every 30 min)
const expireStaleOrders = safeJob('payments', async () => {
  const result = await query(`
    UPDATE payment_orders
    SET    status = 'expired'
    WHERE  status = 'pending'
      AND  created_at < NOW() - INTERVAL '24 hours'
    RETURNING id
  `);
  if (result.rowCount > 0)
    console.log(`[cron:payments] Expired ${result.rowCount} stale payment orders`);
});

// Archive old notification records > 90 days (runs weekly)
const archiveOldNotifications = safeJob('notifications', async () => {
  const result = await query(`
    DELETE FROM notifications
    WHERE  created_at < NOW() - INTERVAL '90 days'
    RETURNING id
  `);
  if (result.rowCount > 0)
    console.log(`[cron:notifications] Archived ${result.rowCount} old notifications`);
});

// Refresh materialized analytics (runs every 6 hours)
const refreshAnalytics = safeJob('analytics', async () => {
  await query(`
    INSERT INTO analytics_daily (school_id, date, active_students, sessions_completed)
    SELECT s.school_id,
           CURRENT_DATE,
           COUNT(DISTINCT ps.student_id),
           COUNT(ps.id)
    FROM   practice_sessions ps
    JOIN   students s ON s.id = ps.student_id
    WHERE  ps.completed_at >= CURRENT_DATE
    ON CONFLICT (school_id, date) DO UPDATE
      SET active_students     = EXCLUDED.active_students,
          sessions_completed  = EXCLUDED.sessions_completed,
          updated_at          = NOW()
  `).catch(() => {}); // table may not exist in all deployments
  console.log('[cron:analytics] Daily analytics refreshed');
});

// ─── Interval-based scheduler (no external dependency) ───────────────────────

const MS = { sec: 1000, min: 60_000, hour: 3_600_000 };

const startCronJobs = () => {
  console.log('[cron] Starting background jobs...');

  // Daily jobs — stagger start by 5 s to avoid thundering herd
  setInterval(flagRescreeningDue,      24 * MS.hour);
  setInterval(archiveOldNotifications, 7  * 24 * MS.hour);

  // Sub-daily jobs
  setInterval(expireStaleOrders, 30 * MS.min);
  setInterval(refreshAnalytics,   6 * MS.hour);

  // Run once at startup (after short delay so DB is ready)
  sleep(5000).then(flagRescreeningDue);
  sleep(8000).then(expireStaleOrders);

  console.log('[cron] Jobs scheduled');
};

module.exports = { startCronJobs };
