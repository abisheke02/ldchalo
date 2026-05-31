-- Chalo ERP Blueprint — Migration 013
-- Auto-adapted: UUID PKs, IF NOT EXISTS idempotency
-- Source: chalo-erp-blueprint-29may2026

-- ============================================
-- MIGRATION 013: Examination Module Extended
Tables: exam_types, exam_settings, grade_master, exam_marks, exam_consolidated, progress_card_settings, other_exams, other_exam_marks
-- ============================================
-- Generated from Chalo ERP Database Migration Plan
-- This migration is idempotent and can be run multiple times
-- ============================================

-- ============================================
-- MIGRATION 013: Examination Module Extension
-- Settings, mark entry approval, progress cards, analysis
-- ============================================

CREATE TABLE IF NOT EXISTS exam_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,  -- PT1, PT2, Half Yearly, Annual
    code VARCHAR(20),
    sort_order INTEGER DEFAULT 0,
    weightage DECIMAL(5,2) DEFAULT 100,  -- % contribution to final result
    is_active BOOLEAN DEFAULT true,
    UNIQUE(school_id, code)
);

CREATE TABLE IF NOT EXISTS exam_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    exam_type_id UUID REFERENCES exam_types(id),
    class_id UUID REFERENCES classes(id),
    subject_id UUID REFERENCES subjects(id),
    max_marks DECIMAL(5,2) NOT NULL DEFAULT 100,
    pass_marks DECIMAL(5,2) NOT NULL DEFAULT 33,
    max_practical_marks DECIMAL(5,2) DEFAULT 0,
    pass_practical_marks DECIMAL(5,2) DEFAULT 0,
    is_graded BOOLEAN DEFAULT false,
    UNIQUE(school_id, exam_type_id, class_id, subject_id)
);

CREATE TABLE IF NOT EXISTS grade_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    grade VARCHAR(5) NOT NULL,  -- A+, A, B+, B, C, D, F
    min_percentage DECIMAL(5,2) NOT NULL,
    max_percentage DECIMAL(5,2) NOT NULL,
    grade_point DECIMAL(3,1),
    description VARCHAR(50),  -- Outstanding, Excellent, Good...
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS exam_marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES examinations(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(user_id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id),
    theory_marks DECIMAL(5,2),
    practical_marks DECIMAL(5,2),
    total_marks DECIMAL(5,2),
    grade VARCHAR(5),
    is_absent BOOLEAN DEFAULT false,
    remarks TEXT,
    entered_by UUID REFERENCES users(id),
    approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(exam_id, student_id, subject_id)
);

CREATE TABLE IF NOT EXISTS exam_consolidated (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(user_id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES academic_years(id),
    class_id UUID REFERENCES classes(id),
    total_marks_obtained DECIMAL(7,2),
    total_max_marks DECIMAL(7,2),
    percentage DECIMAL(5,2),
    overall_grade VARCHAR(5),
    class_rank INTEGER,
    section_rank INTEGER,
    result VARCHAR(20),  -- pass, fail, compartment
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, academic_year_id)
);

CREATE TABLE IF NOT EXISTS progress_card_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES academic_years(id),
    card_title VARCHAR(100) DEFAULT 'Progress Report',
    show_rank BOOLEAN DEFAULT true,
    show_attendance BOOLEAN DEFAULT true,
    show_conduct BOOLEAN DEFAULT true,
    show_co_curricular BOOLEAN DEFAULT true,
    show_teacher_remarks BOOLEAN DEFAULT true,
    header_template TEXT,  -- HTML template for card header
    footer_template TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS other_exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,  -- NEET Mock, JEE Practice, Science Olympiad
    exam_date DATE,
    max_marks DECIMAL(7,2),
    exam_category VARCHAR(50),  -- competitive, olympiad, internal
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS other_exam_marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    other_exam_id UUID REFERENCES other_exams(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(user_id) ON DELETE CASCADE,
    marks_obtained DECIMAL(7,2),
    rank INTEGER,
    percentile DECIMAL(5,2),
    remarks TEXT,
    UNIQUE(other_exam_id, student_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exam_marks_exam ON exam_marks(exam_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_exam_marks_student ON exam_marks(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_consolidated_year ON exam_consolidated(academic_year_id, class_id);
CREATE INDEX IF NOT EXISTS idx_other_exam_marks ON other_exam_marks(other_exam_id);