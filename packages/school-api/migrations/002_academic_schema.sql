-- ============================================================
-- MIGRATION 002 — ACADEMIC SCHEMA
-- Admissions, Attendance, Timetable, Examinations
-- ============================================================

-- ADMISSION ENQUIRIES
CREATE TABLE IF NOT EXISTS admission_enquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  student_name VARCHAR(255) NOT NULL,
  date_of_birth DATE,
  applying_for_class VARCHAR(50),
  parent_name VARCHAR(255) NOT NULL,
  parent_phone VARCHAR(20) NOT NULL,
  parent_email VARCHAR(255),
  address TEXT,
  source VARCHAR(50),  -- walk-in / online / referral
  status VARCHAR(30) DEFAULT 'enquiry' CHECK (status IN ('enquiry','application','interview','admitted','rejected')),
  quota VARCHAR(30),   -- general / management / local
  notes TEXT,
  enquiry_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STUDENT ATTENDANCE
CREATE TABLE IF NOT EXISTS student_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present','absent','late','holiday','leave')),
  period_number INT,  -- NULL = full-day; 1–8 = period-wise
  marked_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date, COALESCE(period_number, -1))
);

-- TIMETABLE RULES (teacher → subject → class)
CREATE TABLE IF NOT EXISTS timetable_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  periods_per_week INT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TIMETABLE SLOTS (generated schedule)
CREATE TABLE IF NOT EXISTS timetable_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 6), -- 1=Mon … 6=Sat
  period_number INT NOT NULL CHECK (period_number BETWEEN 1 AND 10),
  slot_type VARCHAR(20) DEFAULT 'class' CHECK (slot_type IN ('class','break','lunch','pt','library','art')),
  subject_id UUID REFERENCES subjects(id),
  staff_id UUID REFERENCES staff(id),
  room VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, day_of_week, period_number)
);

-- TIMETABLE SUBSTITUTIONS
CREATE TABLE IF NOT EXISTS timetable_substitutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  timetable_slot_id UUID REFERENCES timetable_slots(id),
  date DATE NOT NULL,
  original_staff_id UUID REFERENCES staff(id),
  substitute_staff_id UUID REFERENCES staff(id),
  reason TEXT,
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXAMS
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  term_id UUID REFERENCES terms(id),
  name VARCHAR(100) NOT NULL,  -- "Half Yearly Examination", "PT-1"
  exam_type VARCHAR(30) NOT NULL CHECK (exam_type IN ('periodic_test','half_yearly','annual','practical','project')),
  start_date DATE,
  end_date DATE,
  max_marks INT DEFAULT 100,
  passing_marks INT DEFAULT 33,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXAM SCHEDULES (which subject on which date)
CREATE TABLE IF NOT EXISTS exam_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  exam_date DATE NOT NULL,
  start_time TIME,
  duration_minutes INT DEFAULT 180,
  max_marks INT,
  room VARCHAR(50)
);

-- MARKS
CREATE TABLE IF NOT EXISTS marks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  pt1_marks DECIMAL(5,1),
  notebook_marks DECIMAL(5,1),
  enrichment_marks DECIMAL(5,1),
  half_yearly_marks DECIMAL(5,1),
  total_marks DECIMAL(5,1),
  grade VARCHAR(5),             -- A1 / A2 / B1 / B2 / C1 / C2 / D / E
  teacher_remark TEXT,
  ai_remark TEXT,               -- AI-rephrased remark (Claude)
  entered_by UUID REFERENCES users(id),
  entered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, student_id, subject_id)
);

-- REPORT CARDS
CREATE TABLE IF NOT EXISTS report_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  total_marks DECIMAL(7,1),
  percentage DECIMAL(5,2),
  rank INT,
  attendance_working_days INT,
  attendance_present_days INT,
  height_cm DECIMAL(5,1),
  weight_kg DECIMAL(5,1),
  class_teacher_remark TEXT,
  principal_remark TEXT,
  pdf_url TEXT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, student_id)
);

-- GRADE CONFIG (per school / board)
CREATE TABLE IF NOT EXISTS grade_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  board_type VARCHAR(20) NOT NULL,
  grade VARCHAR(5) NOT NULL,
  min_marks DECIMAL(5,2) NOT NULL,
  max_marks DECIMAL(5,2) NOT NULL,
  grade_point DECIMAL(3,1)
);

-- Seed CBSE grade config
INSERT INTO grade_config (school_id, board_type, grade, min_marks, max_marks, grade_point)
SELECT null, 'CBSE', grade, min_marks, max_marks, grade_point
FROM (VALUES
  ('A1', 91, 100, 10.0),
  ('A2', 81, 90,  9.0),
  ('B1', 71, 80,  8.0),
  ('B2', 61, 70,  7.0),
  ('C1', 51, 60,  6.0),
  ('C2', 41, 50,  5.0),
  ('D',  33, 40,  4.0),
  ('E',  0,  32,  0.0)
) AS t(grade, min_marks, max_marks, grade_point)
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON student_attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON student_attendance(class_id, date);
CREATE INDEX IF NOT EXISTS idx_marks_exam ON marks(exam_id);
CREATE INDEX IF NOT EXISTS idx_marks_student ON marks(student_id);
CREATE INDEX IF NOT EXISTS idx_timetable_class ON timetable_slots(class_id);
