-- Migration 007: Auth fixes
-- 1. Add email column to users (was missing)
-- 2. Make phone nullable (email-only users like teachers/admins)
-- 3. Add password_hash for DB-stored encrypted credentials
-- 4. Enable pgcrypto for DB-level encryption
-- 5. Fix unique indexes to allow multiple NULLs (partial indexes)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add email to users table (teachers/parents log in with email OTP)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(200);

-- Make phone nullable — email-only users must be allowed
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

-- Add password_hash column (bcrypt) for admin/teacher password login
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Drop old non-partial unique index on phone (NULLs were blocked)
DROP INDEX IF EXISTS idx_users_phone;

-- Partial unique indexes: NULLs are ignored, only non-NULL values must be unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique
  ON users(phone) WHERE phone IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
  ON users(email) WHERE email IS NOT NULL;

-- Seed the system admin user record (password_hash set by backend on first start)
INSERT INTO users (id, name, phone, email, role, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'System Admin',
  NULL,
  'admin@system.local',
  'admin',
  NOW()
) ON CONFLICT (id) DO NOTHING;
