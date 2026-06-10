-- Screening answers table (stores individual question responses per session)
CREATE TABLE IF NOT EXISTS screening_answers (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id       UUID NOT NULL REFERENCES screening_sessions(id) ON DELETE CASCADE,
  question_id      UUID NOT NULL REFERENCES screening_questions(id),
  student_answer   TEXT,
  is_correct       BOOLEAN NOT NULL DEFAULT FALSE,
  response_time_ms INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_session_question UNIQUE (session_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_screening_answers_session ON screening_answers(session_id);

-- Add result_data column to screening_sessions (stores AI classification breakdown)
ALTER TABLE screening_sessions
  ADD COLUMN IF NOT EXISTS result_data JSONB;
