-- ─── EXAM SCHEDULES ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_schedules (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id        UUID        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID        NOT NULL REFERENCES academic_years(id),
  term_id          UUID        REFERENCES terms(id),
  name             TEXT        NOT NULL,       -- "Mid-Term Exam 2025"
  exam_type        TEXT        NOT NULL CHECK (exam_type IN ('unit_test','mid_term','final','pre_board','other')),
  class_id         UUID        NOT NULL REFERENCES classes(id),
  starts_on        DATE        NOT NULL,
  ends_on          DATE        NOT NULL,
  total_marks      NUMERIC(8,2),
  pass_percentage  NUMERIC(5,2) NOT NULL DEFAULT 35,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_timetable (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_schedule_id UUID       NOT NULL REFERENCES exam_schedules(id) ON DELETE CASCADE,
  subject_id      UUID        NOT NULL REFERENCES subjects(id),
  section_id      UUID        NOT NULL REFERENCES sections(id),
  exam_date       DATE        NOT NULL,
  starts_at       TIME,
  ends_at         TIME,
  room_number     TEXT,
  invigilator_id  UUID        REFERENCES users(id),
  total_marks     NUMERIC(8,2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (exam_schedule_id, subject_id, section_id)
);

-- ─── EXAM RESULTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_results (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id       UUID        NOT NULL REFERENCES schools(id),
  exam_schedule_id UUID       NOT NULL REFERENCES exam_schedules(id),
  student_id      UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id      UUID        NOT NULL REFERENCES subjects(id),
  marks_obtained  NUMERIC(8,2),
  total_marks     NUMERIC(8,2) NOT NULL,
  grade           TEXT,
  is_absent       BOOLEAN     NOT NULL DEFAULT FALSE,
  remarks         TEXT,
  entered_by      UUID        REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (exam_schedule_id, student_id, subject_id)
);

-- ─── REPORT CARDS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS report_cards (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id        UUID        NOT NULL REFERENCES schools(id),
  student_id       UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id UUID        NOT NULL REFERENCES academic_years(id),
  term_id          UUID        REFERENCES terms(id),
  total_marks      NUMERIC(8,2),
  obtained_marks   NUMERIC(8,2),
  percentage       NUMERIC(5,2),
  grade            TEXT,
  rank             INT,
  teacher_remarks  TEXT,
  principal_remarks TEXT,
  is_published     BOOLEAN     NOT NULL DEFAULT FALSE,
  published_at     TIMESTAMPTZ,
  pdf_url          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_exam_results_student  ON exam_results(student_id, exam_schedule_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_schedule ON exam_results(exam_schedule_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_student  ON report_cards(student_id, academic_year_id);
