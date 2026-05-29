-- Phase 6: Pilot Launch Onboarding
-- School join codes, teacher invites, parent-student links

-- ─────────────────────────────────────────────
-- Add school-level join code (teachers use this to join a school)
-- ─────────────────────────────────────────────
ALTER TABLE schools ADD COLUMN IF NOT EXISTS join_code   VARCHAR(8) UNIQUE;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS principal_name VARCHAR(100);
ALTER TABLE schools ADD COLUMN IF NOT EXISTS board        VARCHAR(50) DEFAULT 'CBSE'
  CHECK (board IN ('CBSE','ICSE','State','Other'));
ALTER TABLE schools ADD COLUMN IF NOT EXISTS student_strength INTEGER DEFAULT 0;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS registered_at   TIMESTAMPTZ DEFAULT NOW();

-- Back-fill: generate random codes for existing schools
UPDATE schools
SET join_code = UPPER(SUBSTRING(MD5(id::text), 1, 6))
WHERE join_code IS NULL;

CREATE INDEX IF NOT EXISTS idx_schools_join_code ON schools(join_code);

-- ─────────────────────────────────────────────
-- TEACHER INVITES (one-time tokens to onboard teachers)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_invites (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  invited_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone        VARCHAR(20),
  email        VARCHAR(200),
  token        VARCHAR(32) NOT NULL UNIQUE,   -- random hex, used in invite link
  role         VARCHAR(20) NOT NULL DEFAULT 'teacher' CHECK (role IN ('teacher','admin')),
  accepted_at  TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_invites_token ON teacher_invites(token);
CREATE INDEX IF NOT EXISTS idx_teacher_invites_school ON teacher_invites(school_id);

-- ─────────────────────────────────────────────
-- PARENT-STUDENT LINKS (teacher links parent phone to student)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parent_student_links (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_phone VARCHAR(20),
  parent_email VARCHAR(200),
  linked_by    UUID NOT NULL REFERENCES users(id),   -- teacher who linked
  linked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  parent_id    UUID REFERENCES users(id) ON DELETE SET NULL,  -- set once parent logs in
  UNIQUE (student_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_links_parent_phone ON parent_student_links(parent_phone);
CREATE INDEX IF NOT EXISTS idx_parent_links_parent_email ON parent_student_links(parent_email);

-- ─────────────────────────────────────────────
-- Add child_id to users so parent can see their child's data
-- ─────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES users(id) ON DELETE SET NULL;
