-- ─── LIBRARY ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS library_books (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id       UUID        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  isbn            TEXT,
  title           TEXT        NOT NULL,
  author          TEXT,
  publisher       TEXT,
  edition         TEXT,
  category        TEXT,
  location        TEXT,        -- shelf/rack
  total_copies    INT         NOT NULL DEFAULT 1,
  available_copies INT        NOT NULL DEFAULT 1,
  cover_url       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS library_issues (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id     UUID        NOT NULL REFERENCES schools(id),
  book_id       UUID        NOT NULL REFERENCES library_books(id),
  user_id       UUID        NOT NULL REFERENCES users(id),
  issued_on     DATE        NOT NULL DEFAULT CURRENT_DATE,
  due_date      DATE        NOT NULL,
  returned_on   DATE,
  fine_amount   NUMERIC(8,2) NOT NULL DEFAULT 0,
  fine_paid     BOOLEAN     NOT NULL DEFAULT FALSE,
  issued_by     UUID        REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── TRANSPORT ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transport_routes (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,    -- "Route A - North"
  vehicle_no   TEXT,
  driver_name  TEXT,
  driver_phone TEXT,
  capacity     INT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transport_stops (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id     UUID        NOT NULL REFERENCES transport_routes(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  pickup_time  TIME,
  drop_time    TIME,
  sort_order   INT         NOT NULL DEFAULT 0,
  monthly_fee  NUMERIC(10,2),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_transport (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id   UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  stop_id      UUID        NOT NULL REFERENCES transport_stops(id),
  academic_year_id UUID   NOT NULL REFERENCES academic_years(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, academic_year_id)
);

-- ─── COMMUNICATIONS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_by   UUID        NOT NULL REFERENCES users(id),
  title        TEXT        NOT NULL,
  body         TEXT        NOT NULL,
  target_roles TEXT[]      NOT NULL DEFAULT '{}',   -- ['parent','teacher'] or ['all']
  channel      TEXT[]      NOT NULL DEFAULT '{"app"}',  -- app, whatsapp, email, sms
  is_pinned    BOOLEAN     NOT NULL DEFAULT FALSE,
  scheduled_at TIMESTAMPTZ,
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id      UUID        NOT NULL REFERENCES schools(id),
  sender_id      UUID        NOT NULL REFERENCES users(id),
  recipient_id   UUID        NOT NULL REFERENCES users(id),
  student_id     UUID        REFERENCES students(id),
  body           TEXT        NOT NULL,
  is_read        BOOLEAN     NOT NULL DEFAULT FALSE,
  read_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_library_issues_user   ON library_issues(user_id, returned_on);
CREATE INDEX IF NOT EXISTS idx_library_issues_book   ON library_issues(book_id, returned_on);
CREATE INDEX IF NOT EXISTS idx_messages_recipient    ON messages(recipient_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_announcements_school  ON announcements(school_id, created_at);
