-- ─── TIMETABLE ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS timetable_periods (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id  UUID        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,    -- "Period 1", "Lunch"
  starts_at  TIME        NOT NULL,
  ends_at    TIME        NOT NULL,
  is_break   BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timetable_slots (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id    UUID        NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  period_id     UUID        NOT NULL REFERENCES timetable_periods(id),
  subject_id    UUID        NOT NULL REFERENCES subjects(id),
  teacher_id    UUID        NOT NULL REFERENCES users(id),
  day_of_week   INT         NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Mon
  room_number   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (section_id, period_id, day_of_week)
);

-- ─── LEAVE MANAGEMENT ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leave_types (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id  UUID        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,    -- "Sick Leave","CL"
  days_limit INT,
  is_paid    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_applications (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id      UUID        NOT NULL REFERENCES schools(id),
  applicant_id   UUID        NOT NULL REFERENCES users(id),
  approver_id    UUID        REFERENCES users(id),
  leave_type_id  UUID        NOT NULL REFERENCES leave_types(id),
  from_date      DATE        NOT NULL,
  to_date        DATE        NOT NULL,
  reason         TEXT,
  status         TEXT        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','rejected','cancelled')),
  remarks        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ATTENDANCE ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_records (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  section_id   UUID        NOT NULL REFERENCES sections(id),
  student_id   UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date         DATE        NOT NULL,
  status       TEXT        NOT NULL CHECK (status IN ('present','absent','late','half_day','holiday','on_leave')),
  marked_by    UUID        REFERENCES users(id),
  period_id    UUID        REFERENCES timetable_periods(id),  -- null = full day
  remarks      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_student_date_period
  ON attendance_records(student_id, date, COALESCE(period_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE TABLE IF NOT EXISTS staff_attendance (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id   UUID        NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  school_id  UUID        NOT NULL REFERENCES schools(id),
  date       DATE        NOT NULL,
  check_in   TIMESTAMPTZ,
  check_out  TIMESTAMPTZ,
  status     TEXT        NOT NULL CHECK (status IN ('present','absent','late','on_leave','half_day')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, date)
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_section_date ON attendance_records(section_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student      ON attendance_records(student_id, date);
CREATE INDEX IF NOT EXISTS idx_timetable_section       ON timetable_slots(section_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_timetable_teacher       ON timetable_slots(teacher_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_leave_applicant         ON leave_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance        ON staff_attendance(staff_id, date);
