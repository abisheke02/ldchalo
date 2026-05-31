-- Chalo ERP Blueprint — Migration 018
-- Auto-adapted: UUID PKs, IF NOT EXISTS idempotency
-- Source: chalo-erp-blueprint-29may2026

-- ============================================
-- MIGRATION 018: Library & Payroll Enhancement
Tables: ALTER library_books, library_fines, ALTER salary_structures, payroll_runs, payslips
-- ============================================
-- Generated from Chalo ERP Database Migration Plan
-- This migration is idempotent and can be run multiple times
-- ============================================

-- ============================================
-- MIGRATION 018: Library & Payroll Enhancements
-- Complete the existing partial modules
-- ============================================

-- Library enhancements
ALTER TABLE library_books ADD COLUMN IF NOT EXISTS isbn VARCHAR(20);
ALTER TABLE library_books ADD COLUMN IF NOT EXISTS edition VARCHAR(20);
ALTER TABLE library_books ADD COLUMN IF NOT EXISTS publisher VARCHAR(100);
ALTER TABLE library_books ADD COLUMN IF NOT EXISTS rack_location VARCHAR(30);

CREATE TABLE IF NOT EXISTS library_fines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID REFERENCES library_issues(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(user_id),
    fine_amount DECIMAL(8,2) NOT NULL,
    fine_reason VARCHAR(100),  -- overdue, lost, damaged
    paid BOOLEAN DEFAULT false,
    paid_at TIMESTAMP,
    collected_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Payroll enhancements
ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS pf_percentage DECIMAL(5,2) DEFAULT 12;
ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS esi_percentage DECIMAL(5,2) DEFAULT 0.75;
ALTER TABLE salary_structures ADD COLUMN IF NOT EXISTS tds_percentage DECIMAL(5,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    total_staff INTEGER DEFAULT 0,
    total_gross DECIMAL(12,2) DEFAULT 0,
    total_deductions DECIMAL(12,2) DEFAULT 0,
    total_net DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',  -- draft, processing, completed
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(school_id, month, year)
);

CREATE TABLE IF NOT EXISTS payslips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
    basic DECIMAL(10,2) DEFAULT 0,
    hra DECIMAL(10,2) DEFAULT 0,
    da DECIMAL(10,2) DEFAULT 0,
    other_allowances DECIMAL(10,2) DEFAULT 0,
    gross_salary DECIMAL(10,2) DEFAULT 0,
    pf_deduction DECIMAL(10,2) DEFAULT 0,
    esi_deduction DECIMAL(10,2) DEFAULT 0,
    tds_deduction DECIMAL(10,2) DEFAULT 0,
    other_deductions DECIMAL(10,2) DEFAULT 0,
    total_deductions DECIMAL(10,2) DEFAULT 0,
    net_salary DECIMAL(10,2) DEFAULT 0,
    days_worked INTEGER DEFAULT 0,
    leave_days INTEGER DEFAULT 0,
    pdf_url VARCHAR(500),
    UNIQUE(payroll_run_id, staff_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_library_fines_student ON library_fines(student_id, paid);
CREATE INDEX IF NOT EXISTS idx_payslips_staff ON payslips(staff_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_month ON payroll_runs(school_id, year, month);