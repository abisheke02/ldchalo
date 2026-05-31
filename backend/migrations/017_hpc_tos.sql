-- Chalo ERP Blueprint — Migration 017
-- Auto-adapted: UUID PKs, IF NOT EXISTS idempotency
-- Source: chalo-erp-blueprint-29may2026

-- ============================================
-- MIGRATION 017: HPC (CBSE) & TOS (PLG/DAV) Module
Tables: hpc_rating_scales, hpc_curriculum_areas, hpc_sub_skills, hpc_assessments, tos_topics, tos_paper_config, tos_subject_coordinators, tos_effort_marks, comment_categories, comment_templates
-- ============================================
-- Generated from Chalo ERP Database Migration Plan
-- This migration is idempotent and can be run multiple times
-- ============================================

-- ============================================
-- MIGRATION 017: HPC (Holistic Progress Card) & TOS
-- CBSE-specific modules
-- ============================================

-- HPC Module
CREATE TABLE IF NOT EXISTS hpc_rating_scales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    code VARCHAR(5) NOT NULL,  -- A+, A, B+, B, C
    name VARCHAR(30) NOT NULL,  -- Outstanding, Excellent, Good
    sort_order INTEGER DEFAULT 0,
    UNIQUE(school_id, code)
);

CREATE TABLE IF NOT EXISTS hpc_curriculum_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    area_name VARCHAR(100) NOT NULL,  -- Work Education, Art Education, Health & Physical Education
    class_id UUID REFERENCES classes(id),
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS hpc_sub_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    curriculum_area_id UUID REFERENCES hpc_curriculum_areas(id) ON DELETE CASCADE,
    skill_name VARCHAR(200) NOT NULL,  -- "Participates in group activities", "Shows creativity"
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS hpc_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(user_id) ON DELETE CASCADE,
    sub_skill_id UUID REFERENCES hpc_sub_skills(id),
    term_id UUID REFERENCES terms(id),
    rating_id UUID REFERENCES hpc_rating_scales(id),
    assessed_by UUID REFERENCES staff(id),
    approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, sub_skill_id, term_id)
);

-- TOS Module
CREATE TABLE IF NOT EXISTS tos_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id),
    class_id UUID REFERENCES classes(id),
    topic_name VARCHAR(200) NOT NULL,
    sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tos_paper_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    exam_type_id UUID REFERENCES exam_types(id),
    subject_id UUID REFERENCES subjects(id),
    class_id UUID REFERENCES classes(id),
    topic_id UUID REFERENCES tos_topics(id),
    question_type VARCHAR(30),  -- mcq, short_answer, long_answer, very_short
    marks_allotted DECIMAL(5,2),
    difficulty_level VARCHAR(20),  -- easy, medium, hard
    cognitive_level VARCHAR(30),  -- remember, understand, apply, analyze, evaluate, create
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tos_subject_coordinators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id),
    class_id UUID REFERENCES classes(id),
    staff_id UUID REFERENCES staff(id),
    academic_year_id UUID REFERENCES academic_years(id),
    UNIQUE(school_id, subject_id, class_id, academic_year_id)
);

CREATE TABLE IF NOT EXISTS tos_effort_marks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(user_id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id),
    term_id UUID REFERENCES terms(id),
    effort_rating VARCHAR(5),  -- A, B, C, D
    remarks TEXT,
    entered_by UUID REFERENCES staff(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, subject_id, term_id)
);

CREATE TABLE IF NOT EXISTS comment_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    category_name VARCHAR(50) NOT NULL,  -- Academic, Behavioral, Sports, General
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS comment_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES comment_categories(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hpc_assessments_student ON hpc_assessments(student_id, term_id);
CREATE INDEX IF NOT EXISTS idx_tos_topics_subject ON tos_topics(subject_id, class_id);
CREATE INDEX IF NOT EXISTS idx_tos_effort_student ON tos_effort_marks(student_id, term_id);