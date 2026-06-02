-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";          -- Neon supports pgvector natively

-- ─── SCHOOLS (multi-tenant root) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schools (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT        NOT NULL,
  code           TEXT        NOT NULL UNIQUE,        -- short slug, e.g. "SVSV2024"
  logo_url       TEXT,
  board_type     TEXT        NOT NULL DEFAULT 'CBSE' CHECK (board_type IN ('CBSE','ICSE','IGCSE','State','IB')),
  address_line1  TEXT,
  address_line2  TEXT,
  city           TEXT,
  state          TEXT,
  pincode        TEXT,
  phone          TEXT,
  email          TEXT,
  website        TEXT,
  established_on DATE,
  timezone       TEXT        NOT NULL DEFAULT 'Asia/Kolkata',
  currency       TEXT        NOT NULL DEFAULT 'INR',
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── USERS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id      UUID        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  email          TEXT,
  phone          TEXT,
  password_hash  TEXT,
  role           TEXT        NOT NULL CHECK (role IN (
                   'super_admin','school_admin','principal',
                   'teacher','staff','parent','student')),
  avatar_url     TEXT,
  fcm_token      TEXT,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  UNIQUE (school_id, email),
  UNIQUE (school_id, phone)
);

-- ─── REFRESH TOKENS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── OTP VERIFICATIONS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_verifications (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone       TEXT        NOT NULL,
  code_hash   TEXT        NOT NULL,
  purpose     TEXT        NOT NULL CHECK (purpose IN ('login','register','reset')),
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── SUBSCRIPTIONS / BILLING ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           TEXT        NOT NULL UNIQUE,     -- "Starter","Growth","Enterprise"
  monthly_price  NUMERIC(10,2) NOT NULL,
  annual_price   NUMERIC(10,2) NOT NULL,
  max_students   INT,
  features       JSONB       NOT NULL DEFAULT '[]',
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_subscriptions (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID        NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  plan_id      UUID        NOT NULL REFERENCES subscription_plans(id),
  status       TEXT        NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','active','past_due','cancelled')),
  billing_cycle TEXT       NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','annual')),
  starts_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at      TIMESTAMPTZ,
  razorpay_subscription_id TEXT UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_school     ON users(school_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_role       ON users(school_id, role) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone      ON users(phone) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_refresh_user     ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_phone        ON otp_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_sub_school       ON school_subscriptions(school_id);
