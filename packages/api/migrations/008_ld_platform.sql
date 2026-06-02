-- ─── LD CONSENT ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ld_consent_records (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id    UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  given_by      UUID        NOT NULL REFERENCES users(id),
  consent_type  TEXT        NOT NULL CHECK (consent_type IN ('screening','sharing','iep')),
  is_granted    BOOLEAN     NOT NULL,
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── LD SCREENINGS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ld_screenings (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id       UUID        NOT NULL REFERENCES schools(id),
  screened_by     UUID        NOT NULL REFERENCES users(id),
  screening_type  TEXT        NOT NULL DEFAULT 'initial'
                  CHECK (screening_type IN ('initial','follow_up','annual')),
  status          TEXT        NOT NULL DEFAULT 'in_progress'
                  CHECK (status IN ('in_progress','completed','reviewed','archived')),
  ld_indicators   TEXT[]      NOT NULL DEFAULT '{}',   -- ['dyslexia','dyscalculia',...]
  risk_level      TEXT        CHECK (risk_level IN ('low','moderate','high','critical')),
  overall_score   NUMERIC(5,2),
  notes           TEXT,
  reviewed_by     UUID        REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  ai_embedding    VECTOR(1536),   -- pgvector for AI similarity search
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ld_screening_responses (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  screening_id  UUID        NOT NULL REFERENCES ld_screenings(id) ON DELETE CASCADE,
  question_id   TEXT        NOT NULL,
  domain        TEXT        NOT NULL,    -- 'reading','writing','numeracy','attention'
  answer        JSONB       NOT NULL,
  score         NUMERIC(5,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (screening_id, question_id)
);

-- ─── LD PRACTICE SESSIONS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ld_practice_sessions (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id     UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id      UUID        NOT NULL REFERENCES schools(id),
  domain         TEXT        NOT NULL,  -- 'reading','writing','numeracy','memory'
  difficulty     TEXT        NOT NULL CHECK (difficulty IN ('easy','medium','hard')),
  exercise_ids   TEXT[]      NOT NULL DEFAULT '{}',
  total_questions INT        NOT NULL,
  correct_answers INT        NOT NULL DEFAULT 0,
  time_spent_secs INT        NOT NULL DEFAULT 0,
  score          NUMERIC(5,2),
  completed      BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_at   TIMESTAMPTZ,
  device_type    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── LD FORMAL TESTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ld_tests (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID        NOT NULL REFERENCES schools(id),
  name         TEXT        NOT NULL,
  test_type    TEXT        NOT NULL CHECK (test_type IN ('reading','phonics','spelling','numeracy','memory','attention','comprehensive')),
  difficulty   TEXT        NOT NULL DEFAULT 'adaptive',
  time_limit   INT,               -- minutes, null = no limit
  total_marks  INT         NOT NULL,
  pass_marks   INT         NOT NULL,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ld_test_attempts (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id        UUID        NOT NULL REFERENCES ld_tests(id),
  student_id     UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id      UUID        NOT NULL REFERENCES schools(id),
  status         TEXT        NOT NULL DEFAULT 'in_progress'
                 CHECK (status IN ('in_progress','completed','abandoned')),
  score          NUMERIC(8,2),
  total_marks    INT         NOT NULL,
  time_taken     INT,              -- seconds
  answers        JSONB       NOT NULL DEFAULT '{}',
  ai_analysis    TEXT,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── IEP (Individual Education Plans) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ld_iep_plans (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id     UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id      UUID        NOT NULL REFERENCES schools(id),
  created_by     UUID        NOT NULL REFERENCES users(id),
  screening_id   UUID        REFERENCES ld_screenings(id),
  goals          JSONB       NOT NULL DEFAULT '[]',
  strategies     JSONB       NOT NULL DEFAULT '[]',
  accommodations JSONB       NOT NULL DEFAULT '[]',
  review_date    DATE,
  status         TEXT        NOT NULL DEFAULT 'active'
                 CHECK (status IN ('draft','active','reviewed','closed')),
  pdf_url        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id   UUID        NOT NULL REFERENCES schools(id),
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  body        TEXT        NOT NULL,
  data        JSONB       NOT NULL DEFAULT '{}',
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ld_screenings_student    ON ld_screenings(student_id, status);
CREATE INDEX IF NOT EXISTS idx_ld_screenings_school     ON ld_screenings(school_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ld_practice_student      ON ld_practice_sessions(student_id, domain, created_at);
CREATE INDEX IF NOT EXISTS idx_ld_attempts_student      ON ld_test_attempts(student_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user       ON notifications(user_id, is_read, created_at);

-- pgvector HNSW index for fast AI similarity search on screenings
CREATE INDEX IF NOT EXISTS idx_ld_screening_embedding
  ON ld_screenings USING hnsw (ai_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
