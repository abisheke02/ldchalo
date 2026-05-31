-- Chalo ERP Blueprint — Migration 021
-- Auto-adapted: UUID PKs, IF NOT EXISTS idempotency
-- Source: chalo-erp-blueprint-29may2026

-- ============================================
-- MIGRATION 021: Visitor Management Module
Tables: visitor_types, visitor_status_master, visitor_entries
-- ============================================
-- Generated from Chalo ERP Database Migration Plan
-- This migration is idempotent and can be run multiple times
-- ============================================

-- ============================================
-- MIGRATION 021: Visitor Management (PLG + DAV only)
-- Visitor entry, tracking, status management
-- (From Section 1, Page 14 — School Info module)
-- ============================================

CREATE TABLE IF NOT EXISTS visitor_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,  -- Parent, Vendor, Official, Alumni, Other
    requires_approval BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS visitor_status_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,  -- Waiting, In Meeting, Completed, Cancelled
    color_code VARCHAR(7),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS visitor_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    visitor_name VARCHAR(100) NOT NULL,
    visitor_phone VARCHAR(20),
    visitor_type_id UUID REFERENCES visitor_types(id),
    purpose VARCHAR(200),
    whom_to_meet VARCHAR(100),
    staff_id UUID REFERENCES staff(id),  -- staff being visited
    student_id UUID REFERENCES students(user_id),  -- if visiting a student
    id_proof_type VARCHAR(30),  -- aadhar, driving_license, voter_id
    id_proof_number VARCHAR(50),
    photo_url VARCHAR(500),
    check_in_time TIMESTAMP DEFAULT NOW(),
    check_out_time TIMESTAMP,
    status_id UUID REFERENCES visitor_status_master(id),
    badge_number VARCHAR(20),
    remarks TEXT,
    registered_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_visitor_entries_date ON visitor_entries(school_id, check_in_time);
CREATE INDEX IF NOT EXISTS idx_visitor_entries_status ON visitor_entries(status_id, check_out_time);

-- Fee Outstanding View
CREATE OR REPLACE VIEW vw_fee_outstanding AS
SELECT 
    s.id AS student_id,
    s.name AS student_name,
    c.name AS class_name,
    fs.total_amount AS total_fee,
    COALESCE(SUM(fcd.net_amount), 0) AS total_paid,
    fs.total_amount - COALESCE(SUM(fcd.net_amount), 0) AS outstanding
FROM students s
JOIN classes c ON s.class_id = c.id
JOIN fee_structures fs ON fs.class_id = c.id
LEFT JOIN fee_collections fc ON fc.student_id = s.id AND fc.cancelled = false
LEFT JOIN fee_collection_details fcd ON fcd.collection_id = fc.id
WHERE s.status = 'active'
GROUP BY s.id, s.name, c.name, fs.total_amount;

-- Daily Collection View
CREATE OR REPLACE VIEW vw_daily_collection AS
SELECT 
    fc.school_id,
    fc.collection_date,
    fc.payment_mode,
    COUNT(*) AS receipt_count,
    SUM(fc.total_amount) AS total_amount
FROM fee_collections fc
WHERE fc.cancelled = false
GROUP BY fc.school_id, fc.collection_date, fc.payment_mode;

-- Attendance Summary View
CREATE OR REPLACE VIEW vw_attendance_summary AS
SELECT 
    a.student_id,
    s.name AS student_name,
    c.name AS class_name,
    COUNT(*) AS total_days,
    SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present_days,
    SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent_days,
    ROUND(
        SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END)::NUMERIC / 
        NULLIF(COUNT(*), 0) * 100, 2
    ) AS attendance_percentage
FROM attendance a
JOIN students s ON a.student_id = s.id
JOIN classes c ON s.class_id = c.id
GROUP BY a.student_id, s.name, c.name;