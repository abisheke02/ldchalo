-- FR-03: Adaptive Practice Engine — Additional schema
-- Adds student state tracking, spaced repetition schedule, and LD type targeting

-- Student practice state (one row per student — tracks level, streak, mastery)
CREATE TABLE IF NOT EXISTS student_practice_state (
  user_id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_level    SMALLINT NOT NULL DEFAULT 1,
  streak_count     INTEGER NOT NULL DEFAULT 0,
  longest_streak   INTEGER NOT NULL DEFAULT 0,
  last_practice_at TIMESTAMPTZ,
  total_sessions   INTEGER NOT NULL DEFAULT 0,
  total_exercises  INTEGER NOT NULL DEFAULT 0,
  total_correct    INTEGER NOT NULL DEFAULT 0,
  mastery_data     JSONB NOT NULL DEFAULT '{}',
  consecutive_correct INTEGER NOT NULL DEFAULT 0,
  consecutive_wrong   INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Spaced repetition schedule (tracks per-exercise review intervals)
CREATE TABLE IF NOT EXISTS spaced_repetition_schedule (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id      UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  next_review_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  interval_days    SMALLINT NOT NULL DEFAULT 1,
  ease_factor      REAL NOT NULL DEFAULT 2.5,
  repetition_count SMALLINT NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_exercise_srs UNIQUE (user_id, exercise_id)
);
CREATE INDEX IF NOT EXISTS idx_srs_user_next ON spaced_repetition_schedule(user_id, next_review_at);

-- Add ld_types column to exercises table (which LD types this exercise targets)
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS ld_types TEXT[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_exercises_ld_types ON exercises USING GIN(ld_types);

-- Add exercise_order column to practice_session_exercises for tracking sequence
ALTER TABLE practice_session_exercises ADD COLUMN IF NOT EXISTS exercise_order SMALLINT DEFAULT 0;

-- Add ld_type to practice_sessions for quick filtering
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS ld_type VARCHAR(30);
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS level_at_start SMALLINT DEFAULT 1;
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS level_at_end SMALLINT DEFAULT 1;
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS exercises_total SMALLINT DEFAULT 0;
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS exercises_correct SMALLINT DEFAULT 0;
