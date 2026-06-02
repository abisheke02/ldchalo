-- ─── FEE STRUCTURES ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_structures (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id        UUID        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  academic_year_id UUID        NOT NULL REFERENCES academic_years(id),
  class_id         UUID        REFERENCES classes(id),   -- null = all classes
  name             TEXT        NOT NULL,                 -- "Tuition Fee Q1"
  amount           NUMERIC(12,2) NOT NULL,
  due_date         DATE        NOT NULL,
  fee_type         TEXT        NOT NULL DEFAULT 'tuition'
                   CHECK (fee_type IN ('tuition','transport','hostel','exam','library',
                                       'sports','lab','activity','development','other')),
  is_recurring     BOOLEAN     NOT NULL DEFAULT FALSE,
  recurrence       TEXT        CHECK (recurrence IN ('monthly','quarterly','annually')),
  late_fee_per_day NUMERIC(8,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── FEE INVOICES (one per student per fee structure) ─────────────────────────
CREATE TABLE IF NOT EXISTS fee_invoices (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id        UUID        NOT NULL REFERENCES schools(id),
  student_id       UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_structure_id UUID        NOT NULL REFERENCES fee_structures(id),
  invoice_number   TEXT        NOT NULL,
  amount           NUMERIC(12,2) NOT NULL,
  discount         NUMERIC(12,2) NOT NULL DEFAULT 0,
  late_fee         NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_amount       NUMERIC(12,2) NOT NULL,
  due_date         DATE        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','partial','paid','overdue','waived','cancelled')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, fee_structure_id)
);

-- ─── FEE PAYMENTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_payments (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id           UUID        NOT NULL REFERENCES schools(id),
  invoice_id          UUID        NOT NULL REFERENCES fee_invoices(id) ON DELETE CASCADE,
  student_id          UUID        NOT NULL REFERENCES students(id),
  amount              NUMERIC(12,2) NOT NULL,
  payment_date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  payment_mode        TEXT        NOT NULL CHECK (payment_mode IN ('cash','upi','card','netbanking','cheque','dd')),
  transaction_ref     TEXT,
  razorpay_payment_id TEXT,
  razorpay_order_id   TEXT,
  collected_by        UUID        REFERENCES users(id),
  receipt_number      TEXT        NOT NULL UNIQUE,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── CONCESSION / SCHOLARSHIP ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_concessions (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID        NOT NULL REFERENCES schools(id),
  student_id   UUID        NOT NULL REFERENCES students(id),
  name         TEXT        NOT NULL,     -- "Sibling Discount","Merit Scholarship"
  type         TEXT        NOT NULL CHECK (type IN ('percentage','fixed')),
  value        NUMERIC(10,2) NOT NULL,
  applicable_to TEXT[]     NOT NULL DEFAULT '{}',  -- fee_type array or ['all']
  valid_from   DATE        NOT NULL,
  valid_until  DATE,
  approved_by  UUID        REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fee_invoices_student  ON fee_invoices(student_id, status);
CREATE INDEX IF NOT EXISTS idx_fee_invoices_school   ON fee_invoices(school_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_fee_payments_invoice  ON fee_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_school   ON fee_payments(school_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_fee_structure_school  ON fee_structures(school_id, academic_year_id);
