-- MIGRATION 024: class_students join table (needed by ld/practice + screening flows)
--
-- Defined originally in 001_core_schema.sql, but that file is marked applied
-- and conflicts elsewhere (refresh_tokens schema), so it can't be re-run wholesale.
-- This is the one missing table from it that the LD module needs.

CREATE TABLE IF NOT EXISTS class_students (
  class_id   UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (class_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_class_students_class   ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student ON class_students(student_id);
