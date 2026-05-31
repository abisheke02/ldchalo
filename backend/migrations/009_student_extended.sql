-- Chalo ERP Blueprint — Migration 009
-- Auto-adapted: UUID PKs, IF NOT EXISTS idempotency
-- Source: chalo-erp-blueprint-29may2026

-- ============================================
-- MIGRATION 009: Student Management Extension
-- Promotion, TC, Certificates, Demographics
-- ============================================

-- Add demographic references to students
ALTER TABLE students ADD COLUMN IF NOT EXISTS religion_id UUID REFERENCES religions(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES communities(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS caste_id UUID REFERENCES castes(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS nationality_id UUID REFERENCES nationalities(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_tongue_id UUID REFERENCES mother_tongues(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS house_id UUID REFERENCES houses(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS blood_group VARCHAR(5);
ALTER TABLE students ADD COLUMN IF NOT EXISTS aadhar_number VARCHAR(12);
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500);

CREATE TABLE IF NOT EXISTS student_promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(user_id) ON DELETE CASCADE,
    from_class_id UUID REFERENCES classes(id),
    to_class_id UUID REFERENCES classes(id),
    from_academic_year_id UUID REFERENCES academic_years(id),
    to_academic_year_id UUID REFERENCES academic_years(id),
    promotion_type VARCHAR(20) NOT NULL,  -- promoted, detained, tc_issued
    promoted_by UUID REFERENCES users(id),
    promoted_at TIMESTAMP DEFAULT NOW(),
    cancelled BOOLEAN DEFAULT false,
    cancelled_by UUID REFERENCES users(id),
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT
);

CREATE TABLE IF NOT EXISTS transfer_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(user_id) ON DELETE CASCADE,
    tc_number VARCHAR(50) UNIQUE,
    issue_date DATE NOT NULL,
    reason VARCHAR(100),  -- parent_request, transfer, completion
    conduct VARCHAR(50) DEFAULT 'Good',
    attendance_percentage DECIMAL(5,2),
    fees_paid_till DATE,
    no_dues_checked BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, issued, cancelled
    pdf_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tc_checklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tc_id UUID REFERENCES transfer_certificates(id) ON DELETE CASCADE,
    checklist_item VARCHAR(100) NOT NULL,  -- Library books returned, Fees cleared, ID card returned
    is_cleared BOOLEAN DEFAULT false,
    cleared_by UUID REFERENCES users(id),
    cleared_at TIMESTAMP,
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS student_siblings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(user_id) ON DELETE CASCADE,
    sibling_student_id UUID REFERENCES students(user_id),
    sibling_name VARCHAR(100),  -- for siblings not in this school
    relation VARCHAR(20),  -- brother, sister
    school_name VARCHAR(200),  -- if sibling in different school
    class_name VARCHAR(50),
    UNIQUE(student_id, sibling_student_id)
);

CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(user_id) ON DELETE CASCADE,
    certificate_type VARCHAR(50) NOT NULL,  -- bonafide, character, study, fee_receipt_80c
    issued_date DATE DEFAULT CURRENT_DATE,
    purpose VARCHAR(200),
    issued_by UUID REFERENCES users(id),
    serial_number VARCHAR(50),
    pdf_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Approval workflows table (reusable for fees, TC, marks, etc.)
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL,  -- fee_category_change, tc_issue, concession, refund, marks_entry
    entity_type VARCHAR(50),  -- student, fee_collection, exam_marks
    entity_id UUID,
    requested_by UUID REFERENCES users(id),
    request_data JSONB,  -- stores the change details
    status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_promotions_student ON student_promotions(student_id, promoted_at DESC);
CREATE INDEX IF NOT EXISTS idx_tc_student ON transfer_certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_tc_status ON transfer_certificates(status);
CREATE INDEX IF NOT EXISTS idx_approval_status ON approval_requests(school_id, request_type, status);
CREATE INDEX IF NOT EXISTS idx_approval_requested_by ON approval_requests(requested_by, created_at DESC);
