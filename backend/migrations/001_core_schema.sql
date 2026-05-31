-- LD Schools — Core Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS schools (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(200) NOT NULL,
  location    VARCHAR(200),
  plan_type   VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free','basic','pro')),
  join_code   VARCHAR(10) UNIQUE,
  subscription_expires_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100),
  email         VARCHAR(200) UNIQUE,
  phone         VARCHAR(20),
  password_hash TEXT,
  role          VARCHAR(20) NOT NULL DEFAULT 'student'
                CHECK (role IN ('student','teacher','parent','school_admin','super_admin')),
  school_id     UUID REFERENCES schools(id) ON DELETE SET NULL,
  fcm_token     TEXT,
  language_pref VARCHAR(10) DEFAULT 'en',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_school   ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_users_role     ON users(role);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user  ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

CREATE TABLE IF NOT EXISTS students (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  age               SMALLINT CHECK (age BETWEEN 5 AND 18),
  class_grade       SMALLINT CHECK (class_grade BETWEEN 1 AND 12),
  ld_type           VARCHAR(30) CHECK (ld_type IN ('dyslexia','dysgraphia','dyscalculia','mixed','not_detected')),
  ld_risk_score     SMALLINT DEFAULT 0 CHECK (ld_risk_score BETWEEN 0 AND 100),
  current_level     SMALLINT NOT NULL DEFAULT 1 CHECK (current_level BETWEEN 1 AND 5),
  streak_count      INTEGER NOT NULL DEFAULT 0,
  last_activity_at  TIMESTAMPTZ,
  teacher_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  parent_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  last_screened_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id  UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  grade      SMALLINT,
  section    VARCHAR(10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_students (
  class_id   UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (class_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_class_students_class   ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student ON class_students(student_id);

CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_sender   ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id  UUID REFERENCES schools(id) ON DELETE CASCADE,
  type       VARCHAR(50) NOT NULL DEFAULT 'announcement',
  title      TEXT NOT NULL,
  body       TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

CREATE TABLE IF NOT EXISTS payment_orders (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id              UUID REFERENCES users(id),
  razorpay_order_id    TEXT UNIQUE,
  razorpay_payment_id  TEXT,
  amount               NUMERIC(10,2) NOT NULL,
  currency             CHAR(3) NOT NULL DEFAULT 'INR',
  status               VARCHAR(20) NOT NULL DEFAULT 'created',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

