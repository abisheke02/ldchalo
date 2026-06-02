/**
 * Upstash Redis — key naming conventions & TTL policies
 * Import this anywhere that needs to build a Redis key.
 * All TTLs in seconds.
 */

const TTL = {
  SESSION:          7  * 24 * 3600,    // 7 days   — user session
  JWT_BLACKLIST:    7  * 24 * 3600,    // 7 days   — matches JWT expiry
  REFRESH_TOKEN:    30 * 24 * 3600,    // 30 days  — refresh token
  OTP:              5  * 60,            // 5 min    — one-time password
  RATE_LIMIT:       60,                 // 1 min    — per-window counter
  SCHOOL_CACHE:     60 * 60,            // 1 hour   — school metadata
  STUDENT_CACHE:    30 * 60,            // 30 min   — student list
  DASHBOARD_CACHE:  15 * 60,            // 15 min   — analytics dashboard
  FEE_SUMMARY:      10 * 60,            // 10 min   — fee summary
  TIMETABLE:        24 * 3600,          // 1 day    — timetable (rarely changes)
  NOTIFICATIONS:    60 * 60,            // 1 hour   — unread count
  PUBSUB_MSG:       5  * 60,            // 5 min    — pub/sub message
};

const KEYS = {
  // ─── Auth ──────────────────────────────────────────────────────────────────
  session:          (userId)          => `session:${userId}`,
  jwtBlacklist:     (token)           => `blacklist:${token}`,
  refreshToken:     (tokenHash)       => `rt:${tokenHash}`,
  otp:              (phone, purpose)  => `otp:${phone}:${purpose}`,

  // ─── Rate Limiting ─────────────────────────────────────────────────────────
  rateLimit:        (ip, endpoint)    => `rl:${ip}:${endpoint}`,
  rateLimitUser:    (userId, action)  => `rlu:${userId}:${action}`,

  // ─── Cache ─────────────────────────────────────────────────────────────────
  schoolMeta:       (schoolId)        => `cache:school:${schoolId}`,
  schoolSettings:   (schoolId)        => `cache:school:settings:${schoolId}`,
  studentList:      (schoolId, page)  => `cache:students:${schoolId}:${page}`,
  studentProfile:   (studentId)       => `cache:student:${studentId}`,
  timetable:        (sectionId)       => `cache:tt:${sectionId}`,
  feesSummary:      (schoolId)        => `cache:fees:${schoolId}`,
  dashboard:        (schoolId, role)  => `cache:dash:${schoolId}:${role}`,
  analyticsSnap:    (schoolId, type)  => `cache:analytics:${schoolId}:${type}`,
  notifCount:       (userId)          => `cache:notif:${userId}`,

  // ─── Background Job Queues ─────────────────────────────────────────────────
  queues: {
    email:              'queue:email',
    pushNotification:   'queue:push',
    whatsapp:           'queue:whatsapp',
    sms:                'queue:sms',
    pdfGenerate:        'queue:pdf',
    reportCard:         'queue:report_card',
    feeReminder:        'queue:fee_reminder',
    attendanceAlert:    'queue:attendance_alert',
    ldRecommendation:   'queue:ld_recommendation',
    analyticsAggregate: 'queue:analytics',
  },

  // ─── Pub/Sub Channels ─────────────────────────────────────────────────────
  channels: {
    attendance:     (schoolId) => `pub:attendance:${schoolId}`,
    feePayment:     (schoolId) => `pub:fee:${schoolId}`,
    newMessage:     (userId)   => `pub:msg:${userId}`,
    notification:   (userId)   => `pub:notif:${userId}`,
    ldUpdate:       (studentId) => `pub:ld:${studentId}`,
  },

  // ─── Distributed Locks ────────────────────────────────────────────────────
  lock:             (resource, id)    => `lock:${resource}:${id}`,
};

module.exports = { TTL, KEYS };
