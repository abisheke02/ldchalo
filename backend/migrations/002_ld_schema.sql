-- LD Schools — Learning Disability Platform Schema

CREATE TABLE IF NOT EXISTS screening_questions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_text  TEXT NOT NULL,
  question_type  VARCHAR(30) NOT NULL DEFAULT 'mcq',
  category       VARCHAR(30),
  options        JSONB,
  correct_answer TEXT,
  order_index    SMALLINT NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS screening_sessions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status            VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  ld_type_detected  VARCHAR(30),
  risk_score        SMALLINT,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_screening_sessions_user ON screening_sessions(user_id);

CREATE TABLE IF NOT EXISTS exercises (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type         VARCHAR(30) NOT NULL,
  level        SMALLINT NOT NULL DEFAULT 1,
  title        TEXT NOT NULL,
  instructions TEXT,
  content      JSONB NOT NULL DEFAULT '{}',
  media_url    TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exercises_type_level ON exercises(type, level);

CREATE TABLE IF NOT EXISTS practice_sessions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_type     VARCHAR(30) NOT NULL DEFAULT 'practice',
  status           VARCHAR(20) NOT NULL DEFAULT 'active',
  duration_minutes INTEGER,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user    ON practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_created ON practice_sessions(created_at DESC);

CREATE TABLE IF NOT EXISTS practice_session_exercises (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id       UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  exercise_id      UUID NOT NULL REFERENCES exercises(id),
  user_answer      TEXT,
  is_correct       BOOLEAN,
  score            SMALLINT DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pse_session ON practice_session_exercises(session_id);

CREATE TABLE IF NOT EXISTS student_errors (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id),
  error_type  VARCHAR(30),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_errors_user ON student_errors(user_id);

CREATE TABLE IF NOT EXISTS test_questions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level          SMALLINT NOT NULL DEFAULT 1,
  question_type  VARCHAR(30) NOT NULL DEFAULT 'mcq',
  question_text  TEXT NOT NULL,
  options        JSONB,
  correct_answer TEXT NOT NULL,
  media_url      TEXT,
  audio_url      TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_test_questions_level ON test_questions(level);

CREATE TABLE IF NOT EXISTS test_attempts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level            SMALLINT NOT NULL,
  score            SMALLINT NOT NULL,
  passed           BOOLEAN NOT NULL DEFAULT FALSE,
  duration_seconds INTEGER,
  answers          JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_test_attempts_user    ON test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_created ON test_attempts(created_at DESC);

CREATE TABLE IF NOT EXISTS level_history (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_level SMALLINT NOT NULL,
  to_level   SMALLINT NOT NULL,
  trigger    VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, from_level, to_level)
);

CREATE TABLE IF NOT EXISTS ai_recommendations (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  class_id   UUID REFERENCES classes(id) ON DELETE CASCADE,
  audience   VARCHAR(20) NOT NULL DEFAULT 'student',
  content    TEXT,
  tips       JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_recs_user    ON ai_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recs_created ON ai_recommendations(created_at DESC);

-- Seed starter screening questions
INSERT INTO screening_questions (id, question_text, question_type, category, options, correct_answer, order_index) VALUES
  (uuid_generate_v4(), 'Which word rhymes with "cat"?', 'mcq', 'phonics', '["bat","dog","car","sit"]', 'bat', 1),
  (uuid_generate_v4(), 'Read this word: "bread". What sound does "ea" make?', 'mcq', 'phonics', '["ee","eh","ay","oo"]', 'eh', 2),
  (uuid_generate_v4(), 'Which letter is missing: "c_t" = "cat"?', 'mcq', 'reading', '["a","e","i","o"]', 'a', 3),
  (uuid_generate_v4(), 'Count: how many syllables in "elephant"?', 'mcq', 'reading', '["1","2","3","4"]', '3', 4),
  (uuid_generate_v4(), 'What is 7 + 8?', 'mcq', 'math', '["13","14","15","16"]', '15', 5)
ON CONFLICT DO NOTHING;

-- Seed starter exercises
INSERT INTO exercises (id, type, level, title, instructions, content) VALUES
  (uuid_generate_v4(), 'phonics', 1, 'Letter Sounds', 'Tap the letter that makes the "buh" sound', '{"target":"b","choices":["b","d","p","q"]}'),
  (uuid_generate_v4(), 'reading', 1, 'Word Match', 'Match the picture to the word', '{"word":"cat","image":"cat.png","choices":["cat","bat","hat","rat"]}'),
  (uuid_generate_v4(), 'math', 1, 'Count Objects', 'Count the apples and choose the correct number', '{"count":5,"choices":[3,4,5,6]}'),
  (uuid_generate_v4(), 'writing', 1, 'Trace the Letter', 'Trace the letter A', '{"letter":"A","type":"trace"}')
ON CONFLICT DO NOTHING;

-- Seed test questions
INSERT INTO test_questions (id, level, question_type, question_text, options, correct_answer) VALUES
  (uuid_generate_v4(), 1, 'mcq', 'Which word starts with the letter B?', '["cat","bat","hat","rat"]', 'bat'),
  (uuid_generate_v4(), 1, 'mcq', 'How many letters in "dog"?', '["2","3","4","5"]', '3'),
  (uuid_generate_v4(), 2, 'mcq', 'What is the opposite of "hot"?', '["warm","cool","cold","fire"]', 'cold'),
  (uuid_generate_v4(), 3, 'mcq', 'Which sentence is correct?', '["She go to school","She goes to school","She going to school","She gone to school"]', 'She goes to school')
ON CONFLICT DO NOTHING;

