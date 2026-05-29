-- ============================================================
-- MIGRATION 001 — CORE SCHEMA
-- Schools, Users, Students, Staff, Classes
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- SCHOOLS
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  logo_url TEXT,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  phone VARCHAR(20),
  email VARCHAR(255),
  board_type VARCHAR(20) DEFAULT 'CBSE', -- CBSE / IGCSE / STATE
  affiliation_no VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACADEMIC YEARS
CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  label VARCHAR(20) NOT NULL, -- e.g. "2024-25"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TERMS
CREATE TABLE IF NOT EXISTS terms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL, -- "Term I", "Term II", "Term III"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false
);

-- USERS (all roles)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL CHECK (role IN ('super_admin','school_admin','principal','teacher','parent','student')),
  password_hash TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- REFRESH TOKENS
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DEPARTMENTS
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL -- "Science", "Mathematics", "Languages"
);

-- SUBJECTS
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20),
  is_elective BOOLEAN DEFAULT false
);

-- CLASSES
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  name VARCHAR(50) NOT NULL,     -- "Grade I", "Grade VI"
  section VARCHAR(10) NOT NULL,  -- "A", "B", "C"
  class_teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  max_students INT DEFAULT 40,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STAFF
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  staff_type VARCHAR(30) NOT NULL CHECK (staff_type IN ('teaching','non_teaching','administration','outsource')),
  employee_code VARCHAR(50),
  department_id UUID REFERENCES departments(id),
  date_of_joining DATE,
  date_of_birth DATE,
  gender VARCHAR(10),
  address TEXT,
  emergency_contact VARCHAR(20),
  biometric_id VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STAFF–SUBJECT MAPPING
CREATE TABLE IF NOT EXISTS staff_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE
);

-- STAFF ATTENDANCE
CREATE TABLE IF NOT EXISTS staff_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present','absent','half_day','on_duty','late','leave')),
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  remarks TEXT,
  marked_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, date)
);

-- PARENTS
CREATE TABLE IF NOT EXISTS parents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  father_name VARCHAR(255),
  mother_name VARCHAR(255),
  guardian_name VARCHAR(255),
  father_phone VARCHAR(20),
  mother_phone VARCHAR(20),
  father_occupation VARCHAR(100),
  mother_occupation VARCHAR(100),
  annual_income VARCHAR(50),
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STUDENTS
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
  admission_number VARCHAR(50) UNIQUE NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  roll_number INT,
  name VARCHAR(255) NOT NULL,
  date_of_birth DATE,
  gender VARCHAR(10),
  blood_group VARCHAR(5),
  photo_url TEXT,
  address TEXT,
  admission_date DATE DEFAULT CURRENT_DATE,
  admission_type VARCHAR(30) DEFAULT 'general', -- general / management_quota / local_quota
  category VARCHAR(50),  -- sibling / staff_child / mgmt_vm
  is_alumni BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  height_cm DECIMAL(5,1),
  weight_kg DECIMAL(5,1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CLASS–STUDENT MAPPING (for history)
CREATE TABLE IF NOT EXISTS class_students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  roll_number INT,
  joined_at DATE DEFAULT CURRENT_DATE,
  left_at DATE
);

-- STUDENT DOCUMENTS
CREATE TABLE IF NOT EXISTS student_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  doc_type VARCHAR(50) NOT NULL, -- birth_certificate / transfer_cert / aadhaar / photo
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(id)
);

-- AUDIT LOGS (IT Act 2000 compliance)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100),
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_staff_school ON staff(school_id);
CREATE INDEX IF NOT EXISTS idx_audit_school ON audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
