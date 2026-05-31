-- Chalo ERP Blueprint — Migration 014
-- Auto-adapted: UUID PKs, IF NOT EXISTS idempotency
-- Source: chalo-erp-blueprint-29may2026

-- ============================================
-- MIGRATION 014: Timetable Module Extended
Tables: staff_timetable_rules, timetable_substitutions, timetable_backups, ALTER timetable_slots
-- ============================================
-- Generated from Chalo ERP Database Migration Plan
-- This migration is idempotent and can be run multiple times
-- ============================================

-- ============================================
-- MIGRATION 014: Timetable Enhancement
-- Staff rules, substitution, backup
-- ============================================

CREATE TABLE IF NOT EXISTS staff_timetable_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    max_periods_per_day INTEGER DEFAULT 6,
    max_continuous_periods INTEGER DEFAULT 3,
    preferred_slots JSONB,  -- [{day: 1, period: 2}, ...] 
    blocked_slots JSONB,  -- [{day: 3, period: 6}]
    can_take_first_period BOOLEAN DEFAULT true,
    can_take_last_period BOOLEAN DEFAULT true,
    academic_year_id UUID REFERENCES academic_years(id),
    UNIQUE(staff_id, academic_year_id)
);

CREATE TABLE IF NOT EXISTS timetable_substitutions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    original_staff_id UUID REFERENCES staff(id),
    substitute_staff_id UUID REFERENCES staff(id),
    class_id UUID REFERENCES classes(id),
    subject_id UUID REFERENCES subjects(id),
    period_id UUID REFERENCES periods(id),
    substitution_date DATE NOT NULL,
    reason VARCHAR(100),
    arranged_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timetable_backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES academic_years(id),
    backup_name VARCHAR(100),
    timetable_data JSONB NOT NULL,  -- Full snapshot of timetable_slots
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add to existing timetable_slots
ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES periods(id);
ALTER TABLE timetable_slots ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_substitutions_date ON timetable_substitutions(school_id, substitution_date);
CREATE INDEX IF NOT EXISTS idx_substitutions_staff ON timetable_substitutions(substitute_staff_id, substitution_date);