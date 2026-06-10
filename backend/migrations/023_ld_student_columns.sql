-- MIGRATION 023: Add LD-platform columns to students table
--
-- The school-ERP `students` table (created by an earlier auth_multitenancy
-- migration) won the `CREATE TABLE IF NOT EXISTS students` race against
-- 001_core_schema.sql, so the LD-specific columns referenced throughout
-- backend/src/routes/ld/* and backend/src/routes/shared/students.js
-- (age, ld_type, current_level, streak_count, etc.) were never created.
-- This migration adds them additively without touching existing data.

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS age              SMALLINT CHECK (age BETWEEN 5 AND 18),
  ADD COLUMN IF NOT EXISTS class_grade       SMALLINT CHECK (class_grade BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS ld_type           VARCHAR(30) CHECK (ld_type IN ('dyslexia','dysgraphia','dyscalculia','mixed','not_detected')),
  ADD COLUMN IF NOT EXISTS ld_risk_score     SMALLINT DEFAULT 0 CHECK (ld_risk_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS current_level     SMALLINT NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS streak_count      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_screened_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS teacher_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_id         UUID REFERENCES users(id) ON DELETE SET NULL;

-- Required for `INSERT ... ON CONFLICT (user_id) DO NOTHING` in shared/students.js
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_user_id_unique ON students(user_id);
