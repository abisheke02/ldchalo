-- ============================================================
-- MIGRATION 003 — FINANCE SCHEMA
-- Fee Structure, 3-Method Collection, Reconciliation
-- ============================================================

-- FEE HEADS (types of fees)
CREATE TABLE IF NOT EXISTS fee_heads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,  -- "Tuition Fees", "Security Deposit", "ECA Fees", "Book Fee"
  is_refundable BOOLEAN DEFAULT false,
  is_optional BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0
);

-- FEE STRUCTURE (amount per class per term)
CREATE TABLE IF NOT EXISTS fee_structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES academic_years(id),
  term_id UUID REFERENCES terms(id),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  fee_head_id UUID REFERENCES fee_heads(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(term_id, class_id, fee_head_id)
);

-- CONCESSION CATEGORIES
CREATE TABLE IF NOT EXISTS concession_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,  -- "Sibling", "Staff Child", "Full Payment", "Management VM"
  description TEXT
);

-- FEE CONCESSIONS (per student per fee head)
CREATE TABLE IF NOT EXISTS fee_concessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  fee_head_id UUID REFERENCES fee_heads(id),
  term_id UUID REFERENCES terms(id),
  concession_category_id UUID REFERENCES concession_categories(id),
  concession_amount DECIMAL(10,2),
  concession_percent DECIMAL(5,2),
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CHALLANS (Method 1)
CREATE TABLE IF NOT EXISTS challans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  term_id UUID REFERENCES terms(id),
  challan_number VARCHAR(50) UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE,
  bank_name VARCHAR(100),
  bank_account VARCHAR(50),
  ifsc_code VARCHAR(20),
  pdf_url TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','paid','reconciled')),
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- FEE TRANSACTIONS (all 3 methods)
CREATE TABLE IF NOT EXISTS fee_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  term_id UUID REFERENCES terms(id),
  challan_id UUID REFERENCES challans(id) ON DELETE SET NULL,
  collection_method VARCHAR(20) NOT NULL CHECK (collection_method IN ('challan','counter','online')),
  amount DECIMAL(10,2) NOT NULL,
  concession_amount DECIMAL(10,2) DEFAULT 0,
  late_fee DECIMAL(10,2) DEFAULT 0,
  net_amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_reference VARCHAR(100),  -- bank ref / Razorpay order ID
  razorpay_payment_id VARCHAR(100),
  razorpay_order_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('pending','success','failed','refunded')),
  collected_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FEE RECEIPTS
CREATE TABLE IF NOT EXISTS fee_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES fee_transactions(id) ON DELETE CASCADE UNIQUE,
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  pdf_url TEXT,
  emailed_at TIMESTAMPTZ,
  whatsapp_sent_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BANK STATEMENTS (for challan reconciliation)
CREATE TABLE IF NOT EXISTS bank_statements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  bank_name VARCHAR(100),
  transaction_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reference_number VARCHAR(100),
  narration TEXT,
  challan_number VARCHAR(50),
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  is_reconciled BOOLEAN DEFAULT false,
  reconciled_at TIMESTAMPTZ,
  reconciled_transaction_id UUID REFERENCES fee_transactions(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- FEE OUTSTANDING (computed view cached here)
CREATE TABLE IF NOT EXISTS fee_outstanding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  term_id UUID REFERENCES terms(id),
  fee_head_id UUID REFERENCES fee_heads(id),
  total_fee DECIMAL(10,2) NOT NULL,
  paid_amount DECIMAL(10,2) DEFAULT 0,
  concession_amount DECIMAL(10,2) DEFAULT 0,
  outstanding DECIMAL(10,2) GENERATED ALWAYS AS (total_fee - paid_amount - concession_amount) STORED,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, term_id, fee_head_id)
);

-- DUPLICATE PAYMENT ALERTS
CREATE TABLE IF NOT EXISTS duplicate_payment_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES fee_transactions(id),
  duplicate_transaction_id UUID REFERENCES fee_transactions(id),
  alert_reason TEXT,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_student ON fee_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_transactions_school_date ON fee_transactions(school_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_outstanding_school ON fee_outstanding(school_id);
CREATE INDEX IF NOT EXISTS idx_outstanding_student ON fee_outstanding(student_id);
CREATE INDEX IF NOT EXISTS idx_bank_stmt_school ON bank_statements(school_id);
