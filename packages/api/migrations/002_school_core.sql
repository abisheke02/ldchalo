-- ─── ACADEMIC YEARS & TERMS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS academic_years (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id  UUID        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,    -- "2025-26"
  starts_on  DATE        NOT NULL,
  ends_on    DATE        NOT NULL,
  is_current BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS terms (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year_id UUID        NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,    -- "Term 1", "Q1"
  starts_on        DATE        NOT NULL,
  ends_on          DATE        NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── DEPARTMENTS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id  UUID        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  head_id    UUID        REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CLASSES & SECTIONS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id        UUID        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID        NOT NULL REFERENCES academic_years(id),
  name             TEXT        NOT NULL,   -- "Grade 6", "Class X"
  numeric_grade    INT,                    -- 6, 10
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sections (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id         UUID        NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,   -- "A","B","C"
  class_teacher_id UUID        REFERENCES users(id),
  room_number      TEXT,
  capacity         INT         NOT NULL DEFAULT 40,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SUBJECTS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  department_id UUID        REFERENCES departments(id),
  name          TEXT        NOT NULL,
  code          TEXT        NOT NULL,
  is_elective   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS section_subjects (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID        NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  subject_id UUID        NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID        REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (section_id, subject_id)
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_academic_year_school ON academic_years(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school       ON classes(school_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_sections_class       ON sections(class_id);
CREATE INDEX IF NOT EXISTS idx_subjects_school      ON subjects(school_id);
CREATE INDEX IF NOT EXISTS idx_section_subjects     ON section_subjects(section_id);
