-- Chalo ERP Blueprint — Migration 022
-- Auto-adapted: UUID PKs, IF NOT EXISTS idempotency
-- Source: chalo-erp-blueprint-29may2026

-- ============================================
-- MIGRATION 022: Database Views for Reporting
-- Tables: (No new tables - only CREATE VIEW statements)
-- Views: vw_fee_outstanding, vw_daily_collection, vw_attendance_summary
-- ============================================
-- Generated from Chalo ERP Database Migration Plan
-- These views provide aggregated data for reporting
-- ============================================

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