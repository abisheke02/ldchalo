-- Migration 008: student invite tokens
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS invite_token VARCHAR(64),
  ADD COLUMN IF NOT EXISTS invite_token_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS users_invite_token_idx ON users (invite_token) WHERE invite_token IS NOT NULL;
