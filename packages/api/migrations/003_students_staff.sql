-- ─── STUDENTS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id                 UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID        UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  school_id          UUID        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  section_id         UUID        REFERENCES sections(id),
  admission_number   TEXT        NOT NULL,
  roll_number        TEXT,
  first_name         TEXT        NOT NULL,
  last_name          TEXT        NOT NULL,
  date_of_birth      DATE,
  gender             TEXT        CHECK (gender IN ('male','female','other')),
  blood_group        TEXT,
  aadhaar_number     TEXT,        -- encrypted at app layer
  religion           TEXT,
  category           TEXT        CHECK (category IN ('general','obc','sc','st','ews')),
  nationality        TEXT        NOT NULL DEFAULT 'Indian',
  address_line1      TEXT,
  address_line2      TEXT,
  city               TEXT,
  state              TEXT,
  pincode            TEXT,
  photo_url          TEXT,
  has_ld_profile     BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active          BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,
  UNIQUE (school_id, admission_number)
);

CREATE TABLE IF NOT EXISTS student_parents (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id   UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_user_id UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relation     TEXT        NOT NULL CHECK (relation IN ('father','mother','guardian','other')),
  is_primary   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, parent_user_id)
);

-- ─── ADMISSIONS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admissions (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id        UUID        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id       UUID        REFERENCES students(id),
  academic_year_id UUID        NOT NULL REFERENCES academic_years(id),
  applied_class    TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'enquiry'
                   CHECK (status IN ('enquiry','applied','shortlisted','admitted','rejected','withdrawn')),
  applicant_name   TEXT        NOT NULL,
  parent_name      TEXT        NOT NULL,
  parent_phone     TEXT        NOT NULL,
  parent_email     TEXT,
  interview_date   TIMESTAMPTZ,
  remarks          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

-- ─── STAFF ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID        UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  school_id        UUID        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  department_id    UUID        REFERENCES departments(id),
  employee_id      TEXT        NOT NULL,
  designation      TEXT        NOT NULL,    -- "PGT Mathematics","Librarian"
  employment_type  TEXT        NOT NULL DEFAULT 'permanent'
                   CHECK (employment_type IN ('permanent','contract','part_time','substitute')),
  joining_date     DATE        NOT NULL,
  relieving_date   DATE,
  qualification    TEXT,
  experience_years INT,
  pan_number       TEXT,        -- encrypted at app layer
  aadhaar_number   TEXT,        -- encrypted at app layer
  bank_account     TEXT,        -- encrypted at app layer
  ifsc_code        TEXT,
  basic_salary     NUMERIC(12,2),
  photo_url        TEXT,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  UNIQUE (school_id, employee_id)
);

-- ─── PAYROLL ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payroll_records (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id         UUID        NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  school_id        UUID        NOT NULL REFERENCES schools(id),
  month            INT         NOT NULL CHECK (month BETWEEN 1 AND 12),
  year             INT         NOT NULL,
  working_days     INT         NOT NULL,
  present_days     INT         NOT NULL,
  basic_salary     NUMERIC(12,2) NOT NULL,
  hra              NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_allowances NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions       NUMERIC(12,2) NOT NULL DEFAULT 0,
  pf_deduction     NUMERIC(12,2) NOT NULL DEFAULT 0,
  tds_deduction    NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_salary       NUMERIC(12,2) NOT NULL,
  payment_date     DATE,
  payment_mode     TEXT        CHECK (payment_mode IN ('bank_transfer','cash','cheque')),
  transaction_ref  TEXT,
  status           TEXT        NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','approved','paid','cancelled')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, month, year)
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_students_school    ON students(school_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_section   ON students(section_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_students_admission ON students(school_id, admission_number);
CREATE INDEX IF NOT EXISTS idx_student_parents    ON student_parents(student_id);
CREATE INDEX IF NOT EXISTS idx_staff_school       ON staff(school_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payroll_staff      ON payroll_records(staff_id, year, month);
