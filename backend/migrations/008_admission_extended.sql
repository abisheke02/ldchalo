-- Chalo ERP Blueprint — Migration 008
-- Auto-adapted: UUID PKs, IF NOT EXISTS idempotency
-- Source: chalo-erp-blueprint-29may2026

-- ============================================
-- MIGRATION 008: Admission Module Extension
-- Enquiry → Followup → Shortlist → Admit
-- ============================================

CREATE TABLE IF NOT EXISTS admission_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,  -- General, Management, NRI, Sports
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS admission_priorities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    rule_name VARCHAR(100) NOT NULL,  -- Sibling Priority, Staff Child
    priority_score INTEGER DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS call_followups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enquiry_id UUID REFERENCES admission_enquiries(id) ON DELETE CASCADE,
    called_by UUID REFERENCES users(id),
    call_date TIMESTAMP DEFAULT NOW(),
    response VARCHAR(50),  -- interested, not_interested, callback, no_answer
    notes TEXT,
    next_call_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enquiry_id UUID REFERENCES admission_enquiries(id) ON DELETE CASCADE,
    interview_date DATE NOT NULL,
    interview_time TIME,
    interviewer_id UUID REFERENCES staff(id),
    status VARCHAR(20) DEFAULT 'scheduled',  -- scheduled, completed, cancelled
    remarks TEXT,
    result VARCHAR(20),  -- selected, waitlisted, rejected
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add columns to existing admission_enquiries
ALTER TABLE admission_enquiries ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES admission_categories(id);
ALTER TABLE admission_enquiries ADD COLUMN IF NOT EXISTS priority_id UUID REFERENCES admission_priorities(id);
ALTER TABLE admission_enquiries ADD COLUMN IF NOT EXISTS health_declaration JSONB;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_call_followups_enquiry ON call_followups(enquiry_id, call_date DESC);
CREATE INDEX IF NOT EXISTS idx_interview_date ON interview_schedule(interview_date);
