-- Chalo ERP Blueprint — Migration 019
-- Auto-adapted: UUID PKs, IF NOT EXISTS idempotency
-- Source: chalo-erp-blueprint-29may2026

-- ============================================
-- MIGRATION 019: Staff Management Extended
Tables: staff_evaluation_criteria, staff_evaluations, staff_evaluation_scores, syllabus_tracking, staff_history, ALTER staff
-- ============================================
-- Generated from Chalo ERP Database Migration Plan
-- This migration is idempotent and can be run multiple times
-- ============================================

-- ============================================
-- MIGRATION 019: Staff Management Extension
-- Evaluation, Syllabus Tracking, Events
-- (From Section 1, Page 7 — Staff Management has 36 unique screens)
-- ============================================

CREATE TABLE IF NOT EXISTS staff_evaluation_criteria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    criteria_name VARCHAR(100) NOT NULL,  -- Teaching Quality, Punctuality, Communication
    max_score DECIMAL(5,2) DEFAULT 10,
    weightage DECIMAL(5,2) DEFAULT 1,
    category VARCHAR(50),  -- academic, administrative, soft_skills
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    evaluator_id UUID REFERENCES users(id),
    academic_year_id UUID REFERENCES academic_years(id),
    evaluation_date DATE DEFAULT CURRENT_DATE,
    total_score DECIMAL(5,2),
    max_possible_score DECIMAL(5,2),
    percentage DECIMAL(5,2),
    overall_grade VARCHAR(5),
    remarks TEXT,
    status VARCHAR(20) DEFAULT 'draft',  -- draft, submitted, reviewed
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_evaluation_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_id UUID REFERENCES staff_evaluations(id) ON DELETE CASCADE,
    criteria_id UUID REFERENCES staff_evaluation_criteria(id),
    score DECIMAL(5,2),
    remarks TEXT,
    UNIQUE(evaluation_id, criteria_id)
);

CREATE TABLE IF NOT EXISTS syllabus_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id),
    subject_id UUID REFERENCES subjects(id),
    academic_year_id UUID REFERENCES academic_years(id),
    topic VARCHAR(200) NOT NULL,
    planned_date DATE,
    completion_date DATE,
    status VARCHAR(20) DEFAULT 'pending',  -- pending, in_progress, completed
    percentage_complete DECIMAL(5,2) DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,  -- joined, promoted, transferred, resigned, terminated
    event_date DATE NOT NULL,
    from_designation VARCHAR(100),
    to_designation VARCHAR(100),
    from_department_id UUID REFERENCES departments(id),
    to_department_id UUID REFERENCES departments(id),
    reason TEXT,
    order_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add columns to existing staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES districts(id);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS evaluation_score DECIMAL(5,2);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staff_eval_staff ON staff_evaluations(staff_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_syllabus_staff ON syllabus_tracking(staff_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_staff_history ON staff_history(staff_id, event_date DESC);