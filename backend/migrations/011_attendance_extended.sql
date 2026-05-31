-- Chalo ERP Blueprint — Migration 011
-- Auto-adapted: UUID PKs, IF NOT EXISTS idempotency
-- Source: chalo-erp-blueprint-29may2026

-- ============================================
-- MIGRATION 011: Attendance Configuration & SMS
-- ============================================

CREATE TABLE IF NOT EXISTS attendance_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    min_attendance_percent DECIMAL(5,2) DEFAULT 75.00,
    late_mark_time TIME,  -- After this time = late
    half_day_time TIME,  -- After this time = half day
    sms_on_absent BOOLEAN DEFAULT true,
    sms_on_late BOOLEAN DEFAULT false,
    marking_type VARCHAR(20) DEFAULT 'daily',  -- daily, period_wise
    is_active BOOLEAN DEFAULT true,
    UNIQUE(school_id)
);

CREATE TABLE IF NOT EXISTS attendance_reasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,  -- SICK, LEAVE, PERMISSION, HOLIDAY
    name VARCHAR(50) NOT NULL,
    is_excused BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(school_id, code)
);

-- Add reason to existing attendance table
ALTER TABLE student_attendance ADD COLUMN IF NOT EXISTS reason_id UUID REFERENCES attendance_reasons(id);
ALTER TABLE student_attendance ADD COLUMN IF NOT EXISTS marked_at TIMESTAMP DEFAULT NOW();
ALTER TABLE student_attendance ADD COLUMN IF NOT EXISTS period_id UUID REFERENCES periods(id);

-- Add staff attendance reason
ALTER TABLE staff_attendance ADD COLUMN IF NOT EXISTS reason_id UUID REFERENCES attendance_reasons(id);
