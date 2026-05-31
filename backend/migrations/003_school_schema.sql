-- LD Schools — School ERP Schema

CREATE TABLE IF NOT EXISTS departments (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name      VARCHAR(100) NOT NULL,
  head_id   UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS subjects (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name      VARCHAR(100) NOT NULL,
  code      VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS staff (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id),
  designation   VARCHAR(100),
  salary        NUMERIC(10,2),
  joined_at     DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_staff_school ON staff(school_id);

CREATE TABLE IF NOT EXISTS staff_attendance (
  staff_id   UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  status     VARCHAR(20) NOT NULL DEFAULT 'present',
  check_in   TIME,
  check_out  TIME,
  PRIMARY KEY (staff_id, date)
);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_date ON staff_attendance(staff_id, date DESC);

CREATE TABLE IF NOT EXISTS student_attendance (
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id   UUID REFERENCES classes(id),
  date       DATE NOT NULL,
  status     VARCHAR(20) NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','late','holiday')),
  marked_by  UUID REFERENCES users(id),
  PRIMARY KEY (student_id, date)
);
CREATE INDEX IF NOT EXISTS idx_student_attendance_class_date ON student_attendance(class_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_student_attendance_student    ON student_attendance(student_id);

CREATE TABLE IF NOT EXISTS timetable_slots (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id       UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week    SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  period_number  SMALLINT NOT NULL,
  subject_id     UUID REFERENCES subjects(id),
  teacher_id     UUID REFERENCES users(id),
  start_time     TIME,
  end_time       TIME,
  UNIQUE (class_id, day_of_week, period_number)
);

CREATE TABLE IF NOT EXISTS exams (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name       VARCHAR(200) NOT NULL,
  exam_type  VARCHAR(30) NOT NULL DEFAULT 'unit_test',
  start_date DATE,
  end_date   DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id         UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id      UUID NOT NULL REFERENCES subjects(id),
  marks_obtained  NUMERIC(6,2),
  max_marks       NUMERIC(6,2) NOT NULL DEFAULT 100,
  UNIQUE (exam_id, student_id, subject_id)
);
CREATE INDEX IF NOT EXISTS idx_marks_student ON marks(student_id);

-- Fee management
CREATE TABLE IF NOT EXISTS fee_structures (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  grade      SMALLINT,
  amount     NUMERIC(10,2) NOT NULL,
  due_date   DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fee_transactions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id      UUID NOT NULL REFERENCES schools(id),
  student_id     UUID NOT NULL REFERENCES users(id),
  amount         NUMERIC(10,2) NOT NULL,
  payment_mode   VARCHAR(20) NOT NULL DEFAULT 'cash',
  receipt_no     TEXT UNIQUE,
  collected_by   UUID REFERENCES users(id),
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fee_transactions_student ON fee_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_transactions_school  ON fee_transactions(school_id);

CREATE TABLE IF NOT EXISTS fee_outstanding (
  student_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  total_due   NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_paid  NUMERIC(10,2) NOT NULL DEFAULT 0,
  balance     NUMERIC(10,2) GENERATED ALWAYS AS (total_due - total_paid) STORED,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id)
);
CREATE INDEX IF NOT EXISTS idx_fee_outstanding_school ON fee_outstanding(school_id);

CREATE TABLE IF NOT EXISTS concession_categories (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id),
  name      VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS fee_concessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   UUID NOT NULL REFERENCES schools(id),
  student_id  UUID NOT NULL REFERENCES users(id),
  category_id UUID REFERENCES concession_categories(id),
  amount      NUMERIC(10,2) NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admissions
CREATE TABLE IF NOT EXISTS admission_enquiries (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_name VARCHAR(150) NOT NULL,
  parent_name  VARCHAR(150),
  parent_phone VARCHAR(20),
  grade        SMALLINT,
  source       VARCHAR(30) NOT NULL DEFAULT 'walk_in',
  status       VARCHAR(30) NOT NULL DEFAULT 'new'
                 CHECK (status IN ('new','contacted','visited','enrolled','rejected')),
  assigned_to  UUID REFERENCES users(id),
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admissions_school  ON admission_enquiries(school_id);
CREATE INDEX IF NOT EXISTS idx_admissions_status  ON admission_enquiries(status);

-- Communications
CREATE TABLE IF NOT EXISTS circulars (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT,
  audience   VARCHAR(20) NOT NULL DEFAULT 'all',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_circulars_school ON circulars(school_id);

