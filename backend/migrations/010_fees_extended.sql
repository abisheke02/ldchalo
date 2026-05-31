-- Chalo ERP Blueprint — Migration 010
-- Auto-adapted: UUID PKs, IF NOT EXISTS idempotency
-- Source: chalo-erp-blueprint-29may2026

-- ============================================
-- MIGRATION 010: Fees Module Extension
-- Full fee lifecycle: structure → collection → receipt → reports
-- ============================================

CREATE TABLE IF NOT EXISTS fee_heads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,  -- Tuition, Lab, Library, Sports, Transport
    code VARCHAR(20),
    head_type VARCHAR(30) DEFAULT 'academic',  -- academic, transport, hostel, other
    is_gst_applicable BOOLEAN DEFAULT false,
    gst_percentage DECIMAL(5,2) DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(school_id, code)
);

CREATE TABLE IF NOT EXISTS fee_structure_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE CASCADE,
    fee_head_id UUID REFERENCES fee_heads(id),
    term_id UUID REFERENCES terms(id),
    amount DECIMAL(10,2) NOT NULL,
    due_date DATE,
    is_mandatory BOOLEAN DEFAULT true,
    UNIQUE(fee_structure_id, fee_head_id, term_id)
);

CREATE TABLE IF NOT EXISTS late_fee_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    fee_head_id UUID REFERENCES fee_heads(id),
    days_after_due INTEGER NOT NULL,  -- 7, 15, 30
    fine_type VARCHAR(20) DEFAULT 'fixed',  -- fixed, percentage, per_day
    fine_amount DECIMAL(10,2) NOT NULL,
    max_fine DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS payment_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    academic_year_id UUID REFERENCES academic_years(id),
    term_id UUID REFERENCES terms(id),
    instalment_number INTEGER DEFAULT 1,
    due_date DATE NOT NULL,
    description VARCHAR(100),
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS fee_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(user_id) ON DELETE CASCADE,
    receipt_number VARCHAR(50) UNIQUE,
    collection_date DATE DEFAULT CURRENT_DATE,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_mode VARCHAR(20) NOT NULL,  -- cash, cheque, online, dd, upi
    cheque_number VARCHAR(30),
    bank_name VARCHAR(100),
    transaction_id VARCHAR(100),  -- Razorpay payment_id
    razorpay_order_id VARCHAR(100),
    academic_year_id UUID REFERENCES academic_years(id),
    collected_by UUID REFERENCES users(id),
    receipt_pdf_url VARCHAR(500),
    cancelled BOOLEAN DEFAULT false,
    cancelled_by UUID REFERENCES users(id),
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fee_collection_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID REFERENCES fee_collections(id) ON DELETE CASCADE,
    fee_head_id UUID REFERENCES fee_heads(id),
    term_id UUID REFERENCES terms(id),
    amount DECIMAL(10,2) NOT NULL,
    fine_amount DECIMAL(10,2) DEFAULT 0,
    concession_amount DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS fee_concessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(user_id) ON DELETE CASCADE,
    fee_head_id UUID REFERENCES fee_heads(id),
    concession_type VARCHAR(30),  -- percentage, fixed, full_waiver
    concession_value DECIMAL(10,2) NOT NULL,
    reason TEXT,
    academic_year_id UUID REFERENCES academic_years(id),
    status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected
    requested_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fee_refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(user_id) ON DELETE CASCADE,
    collection_id UUID REFERENCES fee_collections(id),
    refund_amount DECIMAL(10,2) NOT NULL,
    reason TEXT,
    refund_mode VARCHAR(20),  -- cash, cheque, bank_transfer
    status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, processed
    requested_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    processed_at TIMESTAMP,
    refund_receipt_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS day_closures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    closure_date DATE NOT NULL,
    total_cash DECIMAL(10,2) DEFAULT 0,
    total_cheque DECIMAL(10,2) DEFAULT 0,
    total_online DECIMAL(10,2) DEFAULT 0,
    total_upi DECIMAL(10,2) DEFAULT 0,
    grand_total DECIMAL(10,2) DEFAULT 0,
    receipt_count INTEGER DEFAULT 0,
    closed_by UUID REFERENCES users(id),
    closed_at TIMESTAMP DEFAULT NOW(),
    remarks TEXT,
    UNIQUE(school_id, closure_date)
);

-- Add to existing fee_structures
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES terms(id);
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS is_lumpsum BOOLEAN DEFAULT false;
ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS lumpsum_discount DECIMAL(10,2) DEFAULT 0;

-- Razorpay configuration
INSERT INTO configuration_master (school_id, config_key, config_value, config_type, description)
SELECT id, 'razorpay_key_id', '', 'string', 'Razorpay API Key ID'
FROM schools WHERE NOT EXISTS (
    SELECT 1 FROM configuration_master WHERE config_key = 'razorpay_key_id'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_collections_student ON fee_collections(student_id, collection_date DESC);
CREATE INDEX IF NOT EXISTS idx_collections_date ON fee_collections(school_id, collection_date);
CREATE INDEX IF NOT EXISTS idx_collections_receipt ON fee_collections(receipt_number);
CREATE INDEX IF NOT EXISTS idx_collection_details_head ON fee_collection_details(fee_head_id);
CREATE INDEX IF NOT EXISTS idx_concessions_student ON fee_concessions(student_id, status);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON fee_refunds(school_id, status);
CREATE INDEX IF NOT EXISTS idx_day_closures_date ON day_closures(school_id, closure_date);
