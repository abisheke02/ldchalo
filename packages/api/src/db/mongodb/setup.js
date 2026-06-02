/**
 * MongoDB Atlas — collection + index setup script
 * Run once at deploy time: node src/db/mongodb/setup.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../.env') });

const { connectMongo, getDb, closeMongo } = require('../../config/mongodb');

const setup = async () => {
  await connectMongo();
  const db = getDb();

  // ─── 1. ai_recommendations ─────────────────────────────────────────────────
  // Stores Claude-generated LD recommendations per student
  await db.createCollection('ai_recommendations', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['student_id', 'school_id', 'type', 'content', 'created_at'],
        properties: {
          student_id:   { bsonType: 'string' },
          school_id:    { bsonType: 'string' },
          type:         { enum: ['practice', 'iep', 'parent_tip', 'teacher_strategy', 'weekly_plan'] },
          content:      { bsonType: 'string' },
          metadata:     { bsonType: 'object' },
          embedding:    { bsonType: 'array' },    // 1536-dim vector for Atlas Search
          model_used:   { bsonType: 'string' },
          token_count:  { bsonType: 'int' },
          created_at:   { bsonType: 'date' },
          expires_at:   { bsonType: 'date' },
        },
      },
    },
  }).catch(() => {});

  await db.collection('ai_recommendations').createIndexes([
    { key: { student_id: 1, type: 1, created_at: -1 } },
    { key: { school_id: 1, created_at: -1 } },
    { key: { expires_at: 1 }, expireAfterSeconds: 0 },   // TTL — auto-delete old recs
  ]);
  console.log('[mongo] ✓ ai_recommendations');

  // ─── 2. chatbot_conversations ───────────────────────────────────────────────
  // AI chatbot sessions (teacher/parent queries to Claude)
  await db.createCollection('chatbot_conversations', {
    validator: {
      $jsonSchema: {
        bsonType: 'object',
        required: ['user_id', 'school_id', 'messages', 'created_at'],
        properties: {
          user_id:    { bsonType: 'string' },
          school_id:  { bsonType: 'string' },
          title:      { bsonType: 'string' },
          messages:   {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              required: ['role', 'content', 'timestamp'],
              properties: {
                role:       { enum: ['user', 'assistant', 'system'] },
                content:    { bsonType: 'string' },
                timestamp:  { bsonType: 'date' },
                tokens:     { bsonType: 'int' },
              },
            },
          },
          total_tokens:   { bsonType: 'int' },
          model_used:     { bsonType: 'string' },
          is_archived:    { bsonType: 'bool' },
          created_at:     { bsonType: 'date' },
          updated_at:     { bsonType: 'date' },
        },
      },
    },
  }).catch(() => {});

  await db.collection('chatbot_conversations').createIndexes([
    { key: { user_id: 1, updated_at: -1 } },
    { key: { school_id: 1, updated_at: -1 } },
    { key: { updated_at: 1 }, expireAfterSeconds: 60 * 60 * 24 * 90 },  // 90-day TTL
  ]);
  console.log('[mongo] ✓ chatbot_conversations');

  // ─── 3. user_preferences ───────────────────────────────────────────────────
  // Per-user app settings (flexible structure, changes often)
  await db.createCollection('user_preferences').catch(() => {});

  await db.collection('user_preferences').createIndexes([
    { key: { user_id: 1 }, unique: true },
    { key: { school_id: 1 } },
  ]);
  console.log('[mongo] ✓ user_preferences');
  // Sample doc: { user_id, school_id, theme, language, notifications: {push,email,whatsapp}, dashboard_layout, created_at, updated_at }

  // ─── 4. analytics_snapshots ────────────────────────────────────────────────
  // Pre-computed daily/weekly snapshots for fast dashboard loads
  await db.createCollection('analytics_snapshots').catch(() => {});

  await db.collection('analytics_snapshots').createIndexes([
    { key: { school_id: 1, snapshot_type: 1, date: -1 } },
    { key: { date: 1 }, expireAfterSeconds: 60 * 60 * 24 * 90 },  // 90-day TTL
  ]);
  console.log('[mongo] ✓ analytics_snapshots');
  // Sample doc: { school_id, snapshot_type: 'daily_fees', date, data: {...}, created_at }

  // ─── 5. ld_exercise_content ────────────────────────────────────────────────
  // Flexible exercise content (complex nested structure, varies per type)
  await db.createCollection('ld_exercise_content').catch(() => {});

  await db.collection('ld_exercise_content').createIndexes([
    { key: { domain: 1, difficulty: 1, is_active: 1 } },
    { key: { tags: 1 } },
    { key: { school_id: 1 } },
    { key: { created_at: -1 } },
  ]);
  console.log('[mongo] ✓ ld_exercise_content');
  // Sample doc: { domain, difficulty, exercise_type, title, instructions, content: {...}, tags, age_range, is_active, created_at }

  // ─── 6. notification_logs ──────────────────────────────────────────────────
  // Full log of every push/WhatsApp/email sent
  await db.createCollection('notification_logs').catch(() => {});

  await db.collection('notification_logs').createIndexes([
    { key: { school_id: 1, sent_at: -1 } },
    { key: { user_id: 1, sent_at: -1 } },
    { key: { channel: 1, status: 1, sent_at: -1 } },
    { key: { sent_at: 1 }, expireAfterSeconds: 60 * 60 * 24 * 180 },  // 180-day TTL
  ]);
  console.log('[mongo] ✓ notification_logs');
  // Sample doc: { school_id, user_id, channel: 'push'|'whatsapp'|'email'|'sms', title, body, status, provider_ref, sent_at }

  // ─── 7. audit_logs ─────────────────────────────────────────────────────────
  // Immutable audit trail of all sensitive actions
  await db.createCollection('audit_logs').catch(() => {});

  await db.collection('audit_logs').createIndexes([
    { key: { school_id: 1, created_at: -1 } },
    { key: { user_id: 1, created_at: -1 } },
    { key: { resource: 1, action: 1, created_at: -1 } },
    { key: { created_at: 1 }, expireAfterSeconds: 60 * 60 * 24 * 365 * 2 }, // 2-year TTL
  ]);
  console.log('[mongo] ✓ audit_logs');
  // Sample doc: { school_id, user_id, action: 'UPDATE', resource: 'students', resource_id, changes: {before,after}, ip, user_agent, created_at }

  console.log('\n[mongo] All collections and indexes ready ✅');
  await closeMongo();
};

setup().catch((err) => {
  console.error('[mongo] Setup failed:', err.message);
  process.exit(1);
});
