-- Chalo ERP Blueprint — Migration 020
-- Auto-adapted: UUID PKs, IF NOT EXISTS idempotency
-- Source: chalo-erp-blueprint-29may2026

-- ============================================
-- MIGRATION 020: Fees & Payments Advanced
Tables: gst_master, donation_collections, cash_denominations, bus_fee_structures, hostel_fee_structures, lumpsum_fee_config, lumpsum_student_mapping, credit_notes, fee_receipt_config
-- ============================================
-- Generated from Chalo ERP Database Migration Plan
-- This migration is idempotent and can be run multiple times
-- ============================================

-- ============================================
-- MIGRATION 020: Advanced Fee Features
-- Donation, GST, Cash Denomination, Bus/Hostel Fee, Credit Notes
-- (From Section 1, Page 8 — Fees has 38 unique screens)
-- ============================================

CREATE TABLE IF NOT EXISTS gst_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    fee_head_id UUID REFERENCES fee_heads(id),
    gst_percentage DECIMAL(5,2) NOT NULL,  -- 5, 12, 18, 28
    hsn_code VARCHAR(20),
    cgst_percent DECIMAL(5,2),
    sgst_percent DECIMAL(5,2),
    igst_percent DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(school_id, fee_head_id)
);

CREATE TABLE IF NOT EXISTS donation_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(user_id),
    donor_name VARCHAR(200),
    donation_type VARCHAR(50),  -- building_fund, sports, library, general
    amount DECIMAL(10,2) NOT NULL,
    payment_mode VARCHAR(20),
    receipt_number VARCHAR(50) UNIQUE,
    collection_date DATE DEFAULT CURRENT_DATE,
    is_80g_eligible BOOLEAN DEFAULT false,
    certificate_number VARCHAR(50),
    cancelled BOOLEAN DEFAULT false,
    cancelled_by UUID REFERENCES users(id),
    cancellation_reason TEXT,
    collected_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_denominations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    day_closure_id UUID REFERENCES day_closures(id) ON DELETE CASCADE,
    denomination INTEGER NOT NULL,  -- 2000, 500, 200, 100, 50, 20, 10, 5, 2, 1
    count INTEGER DEFAULT 0,
    total DECIMAL(10,2) GENERATED ALWAYS AS (denomination * count) STORED,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bus_fee_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    route_id UUID REFERENCES transport_routes(id),
    stop_name VARCHAR(100),
    distance_km DECIMAL(5,2),
    monthly_fee DECIMAL(10,2) NOT NULL,
    annual_fee DECIMAL(10,2),
    academic_year_id UUID REFERENCES academic_years(id),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(route_id, stop_name, academic_year_id)
);

CREATE TABLE IF NOT EXISTS hostel_fee_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    hostel_id UUID REFERENCES hostels(id),
    room_type VARCHAR(30),
    monthly_fee DECIMAL(10,2) NOT NULL,
    annual_fee DECIMAL(10,2),
    food_fee DECIMAL(10,2) DEFAULT 0,
    academic_year_id UUID REFERENCES academic_years(id),
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS lumpsum_fee_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id),
    academic_year_id UUID REFERENCES academic_years(id),
    total_annual_fee DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    last_date_for_lumpsum DATE,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(school_id, class_id, academic_year_id)
);

CREATE TABLE IF NOT EXISTS lumpsum_student_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lumpsum_config_id UUID REFERENCES lumpsum_fee_config(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(user_id) ON DELETE CASCADE,
    opted_date DATE DEFAULT CURRENT_DATE,
    payment_status VARCHAR(20) DEFAULT 'pending',  -- pending, paid
    collection_id UUID REFERENCES fee_collections(id),
    UNIQUE(lumpsum_config_id, student_id)
);

CREATE TABLE IF NOT EXISTS credit_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(user_id) ON DELETE CASCADE,
    credit_note_number VARCHAR(50) UNIQUE,
    original_collection_id UUID REFERENCES fee_collections(id),
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'active',  -- active, utilized, expired
    utilized_in_collection_id UUID REFERENCES fee_collections(id),
    issued_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    issued_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fee_receipt_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    header_text TEXT,
    footer_text TEXT,
    show_logo BOOLEAN DEFAULT true,
    show_student_photo BOOLEAN DEFAULT false,
    show_balance BOOLEAN DEFAULT true,
    paper_size VARCHAR(10) DEFAULT 'A4',  -- A4, A5, thermal
    copies INTEGER DEFAULT 2,  -- original + duplicate
    template_html TEXT,  -- custom HTML template
    is_active BOOLEAN DEFAULT true,
    UNIQUE(school_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_donations_school ON donation_collections(school_id, collection_date);
CREATE INDEX IF NOT EXISTS idx_donations_student ON donation_collections(student_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_student ON credit_notes(student_id, status);
CREATE INDEX IF NOT EXISTS idx_bus_fee_route ON bus_fee_structures(route_id);
CREATE INDEX IF NOT EXISTS idx_lumpsum_mapping ON lumpsum_student_mapping(student_id);