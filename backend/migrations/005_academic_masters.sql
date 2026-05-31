-- Chalo ERP Blueprint — Migration 005
-- Auto-adapted: UUID PKs, IF NOT EXISTS idempotency
-- Source: chalo-erp-blueprint-29may2026

-- ============================================
-- MIGRATION 005: Academic Master Tables
-- Used by timetable, exams, fees, student assignment
-- ============================================

CREATE TABLE IF NOT EXISTS boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,  -- CBSE, ICSE, State Board, Matric
    code VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,  -- Primary, Middle, Secondary, Higher Secondary
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- ALTER existing tables to add references
ALTER TABLE classes ADD COLUMN IF NOT EXISTS level_id UUID REFERENCES levels(id);
ALTER TABLE classes ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES boards(id);
ALTER TABLE classes ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES academic_years(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,  -- Term 1, Term 2, Annual
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subject_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,  -- Theory, Practical, Language, Elective
    is_active BOOLEAN DEFAULT true
);

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS subject_type_id UUID REFERENCES subject_types(id);
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_elective BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS class_subject_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES academic_years(id),
    periods_per_week INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(class_id, subject_id, academic_year_id)
);

CREATE TABLE IF NOT EXISTS streams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,  -- Science, Commerce, Arts
    level_id UUID REFERENCES levels(id),
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS subject_combinations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stream_id UUID REFERENCES streams(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,  -- "PCM + CS", "PCB + Bio"
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS subject_combination_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    combination_id UUID REFERENCES subject_combinations(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    is_optional BOOLEAN DEFAULT false,
    UNIQUE(combination_id, subject_id)
);

CREATE TABLE IF NOT EXISTS houses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,  -- Red House, Blue House
    color_code VARCHAR(7),  -- #FF0000
    captain_student_id UUID,
    is_active BOOLEAN DEFAULT true
);

-- Seed subject types
INSERT INTO subject_types (name) VALUES 
    ('Theory'), ('Practical'), ('Language'), ('Elective'), ('Co-curricular');
