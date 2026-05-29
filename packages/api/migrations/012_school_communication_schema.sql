-- ============================================================
-- MIGRATION 004 — COMMUNICATION & ADD-ONS SCHEMA
-- Circulars, Notifications, Library, Transport, Payroll
-- ============================================================

-- CIRCULARS / NOTICES
CREATE TABLE IF NOT EXISTS circulars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  ai_rephrased_body TEXT,  -- Claude API rephrased version
  audience VARCHAR(30) DEFAULT 'all' CHECK (audience IN ('all','teachers','parents','students','specific_class')),
  class_ids UUID[],        -- for specific class targeting
  category VARCHAR(50),    -- homework / assignment / event / alert
  attachment_url TEXT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICATION LOGS
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  circular_id UUID REFERENCES circulars(id) ON DELETE SET NULL,
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('fcm','whatsapp','sms','email')),
  title VARCHAR(255),
  body TEXT,
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent','delivered','failed','read')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);

-- WHATSAPP TEMPLATES
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, -- fee_reminder / attendance_alert / birthday_wish
  template_text TEXT NOT NULL,
  variables JSONB,  -- {"student_name": "...", "amount": "..."}
  is_active BOOLEAN DEFAULT true
);

-- ============================================================
-- LIBRARY MODULE
-- ============================================================
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  isbn VARCHAR(20),
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255),
  publisher VARCHAR(255),
  subject_id UUID REFERENCES subjects(id),
  total_copies INT DEFAULT 1,
  available_copies INT DEFAULT 1,
  location VARCHAR(50),  -- shelf/rack
  added_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS book_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  issued_by UUID REFERENCES users(id),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  return_date DATE,
  fine_amount DECIMAL(6,2) DEFAULT 0,
  fine_paid BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'issued' CHECK (status IN ('issued','returned','overdue','lost'))
);

-- ============================================================
-- TRANSPORT MODULE
-- ============================================================
CREATE TABLE IF NOT EXISTS routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,  -- "Route 1 - Adyar"
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  pickup_time TIME,
  drop_time TIME,
  order_no INT
);

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  registration_number VARCHAR(20) UNIQUE NOT NULL,
  vehicle_type VARCHAR(20) DEFAULT 'bus',
  capacity INT,
  driver_name VARCHAR(255),
  driver_phone VARCHAR(20),
  gps_device_id VARCHAR(100),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS student_transport (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id),
  stop_id UUID REFERENCES stops(id),
  vehicle_id UUID REFERENCES vehicles(id),
  academic_year_id UUID REFERENCES academic_years(id),
  pickup_or_drop VARCHAR(10) DEFAULT 'both' CHECK (pickup_or_drop IN ('pickup','drop','both')),
  monthly_fee DECIMAL(8,2),
  UNIQUE(student_id, academic_year_id)
);

-- ============================================================
-- PAYROLL MODULE
-- ============================================================
CREATE TABLE IF NOT EXISTS salary_structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  basic_salary DECIMAL(10,2) NOT NULL,
  hra DECIMAL(10,2) DEFAULT 0,
  da DECIMAL(10,2) DEFAULT 0,
  transport_allowance DECIMAL(10,2) DEFAULT 0,
  other_allowance DECIMAL(10,2) DEFAULT 0,
  pf_deduction DECIMAL(10,2) DEFAULT 0,
  esi_deduction DECIMAL(10,2) DEFAULT 0,
  tds_deduction DECIMAL(10,2) DEFAULT 0,
  effective_from DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','approved','disbursed')),
  total_gross DECIMAL(12,2),
  total_net DECIMAL(12,2),
  generated_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, month, year)
);

CREATE TABLE IF NOT EXISTS payslips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  gross_salary DECIMAL(10,2) NOT NULL,
  total_deductions DECIMAL(10,2) NOT NULL,
  net_salary DECIMAL(10,2) NOT NULL,
  leave_deductions DECIMAL(10,2) DEFAULT 0,
  days_worked INT,
  pdf_url TEXT,
  is_emailed BOOLEAN DEFAULT false,
  UNIQUE(payroll_run_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_circulars_school ON circulars(school_id);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_book_issues_student ON book_issues(student_id);
CREATE INDEX IF NOT EXISTS idx_payroll_school ON payroll_runs(school_id, year, month);
