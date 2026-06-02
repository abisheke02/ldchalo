-- ─── Databricks Analytics Schema ─────────────────────────────────────────────
-- Run in your Databricks SQL Warehouse (one-time setup)
-- Replace hive_metastore.analytics with your actual catalog.schema

USE CATALOG hive_metastore;

CREATE SCHEMA IF NOT EXISTS analytics
  COMMENT 'School ERP + LD Platform — analytics warehouse';

USE SCHEMA analytics;

-- ─── 1. EVENTS (raw event stream) ────────────────────────────────────────────
-- All user/system events land here. Partitioned by date for fast range queries.
CREATE TABLE IF NOT EXISTS events (
  event_id      STRING       NOT NULL,
  school_id     STRING       NOT NULL,
  user_id       STRING,
  session_id    STRING,
  event_type    STRING       NOT NULL,   -- 'fee_paid','student_added','ld_screening_done',...
  entity_type   STRING,                  -- 'student','staff','fee','screening'
  entity_id     STRING,
  properties    STRING,                  -- JSON blob
  device_type   STRING,                  -- 'web','mobile','desktop'
  app_version   STRING,
  ip_region     STRING,
  event_ts      TIMESTAMP    NOT NULL,
  ingested_at   TIMESTAMP    NOT NULL DEFAULT current_timestamp()
)
USING DELTA
PARTITIONED BY (DATE(event_ts))
TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact'   = 'true'
);

-- ─── 2. DAILY SCHOOL METRICS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_school_metrics (
  metric_date          DATE      NOT NULL,
  school_id            STRING    NOT NULL,
  total_students       BIGINT,
  active_students      BIGINT,
  present_today        BIGINT,
  attendance_pct       DOUBLE,
  fees_collected_inr   DOUBLE,
  fees_outstanding_inr DOUBLE,
  new_admissions       BIGINT,
  staff_present        BIGINT,
  messages_sent        BIGINT,
  created_at           TIMESTAMP NOT NULL DEFAULT current_timestamp()
)
USING DELTA
PARTITIONED BY (metric_date)
TBLPROPERTIES ('delta.autoOptimize.optimizeWrite' = 'true');

-- ─── 3. FEE ANALYTICS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_analytics (
  payment_date      DATE      NOT NULL,
  school_id         STRING    NOT NULL,
  fee_type          STRING    NOT NULL,
  payment_mode      STRING    NOT NULL,
  total_amount      DOUBLE    NOT NULL,
  transaction_count BIGINT    NOT NULL,
  avg_amount        DOUBLE,
  student_count     BIGINT,
  created_at        TIMESTAMP NOT NULL DEFAULT current_timestamp()
)
USING DELTA
PARTITIONED BY (payment_date)
TBLPROPERTIES ('delta.autoOptimize.optimizeWrite' = 'true');

-- ─── 4. ATTENDANCE ANALYTICS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_analytics (
  record_date          DATE      NOT NULL,
  school_id            STRING    NOT NULL,
  section_id           STRING    NOT NULL,
  class_name           STRING,
  section_name         STRING,
  total_students       BIGINT    NOT NULL,
  present_count        BIGINT    NOT NULL,
  absent_count         BIGINT    NOT NULL,
  late_count           BIGINT    NOT NULL,
  attendance_pct       DOUBLE    NOT NULL,
  created_at           TIMESTAMP NOT NULL DEFAULT current_timestamp()
)
USING DELTA
PARTITIONED BY (record_date)
TBLPROPERTIES ('delta.autoOptimize.optimizeWrite' = 'true');

-- ─── 5. LD ASSESSMENT ANALYTICS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ld_assessment_analytics (
  assessment_date    DATE      NOT NULL,
  school_id          STRING    NOT NULL,
  student_id         STRING    NOT NULL,
  assessment_type    STRING    NOT NULL,   -- 'screening','practice','test'
  domain             STRING,
  score              DOUBLE,
  risk_level         STRING,
  improvement_delta  DOUBLE,              -- change from last assessment
  time_spent_secs    BIGINT,
  created_at         TIMESTAMP NOT NULL DEFAULT current_timestamp()
)
USING DELTA
PARTITIONED BY (assessment_date)
TBLPROPERTIES ('delta.autoOptimize.optimizeWrite' = 'true');

-- ─── 6. USER ENGAGEMENT ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_engagement (
  session_date     DATE      NOT NULL,
  school_id        STRING    NOT NULL,
  user_id          STRING    NOT NULL,
  role             STRING    NOT NULL,
  device_type      STRING,
  session_count    BIGINT    NOT NULL DEFAULT 1,
  total_duration   BIGINT,               -- seconds
  screens_visited  BIGINT,
  actions_taken    BIGINT,
  created_at       TIMESTAMP NOT NULL DEFAULT current_timestamp()
)
USING DELTA
PARTITIONED BY (session_date)
TBLPROPERTIES ('delta.autoOptimize.optimizeWrite' = 'true');

-- ─── 7. REVENUE ANALYTICS (SaaS MRR/ARR) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue_analytics (
  billing_date      DATE      NOT NULL,
  school_id         STRING    NOT NULL,
  plan_name         STRING    NOT NULL,
  billing_cycle     STRING    NOT NULL,   -- 'monthly','annual'
  amount_inr        DOUBLE    NOT NULL,
  payment_status    STRING    NOT NULL,
  mrr_contribution  DOUBLE,
  arr_contribution  DOUBLE,
  created_at        TIMESTAMP NOT NULL DEFAULT current_timestamp()
)
USING DELTA
PARTITIONED BY (billing_date)
TBLPROPERTIES ('delta.autoOptimize.optimizeWrite' = 'true');

-- ─── 8. AI MODEL TRACKING (MLflow-compatible) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_model_runs (
  run_id            STRING    NOT NULL,
  school_id         STRING,
  model_name        STRING    NOT NULL,   -- 'ld-screener-v2','fee-predictor'
  model_version     STRING,
  input_tokens      BIGINT,
  output_tokens     BIGINT,
  latency_ms        BIGINT,
  cost_usd          DOUBLE,
  success           BOOLEAN   NOT NULL DEFAULT true,
  error_message     STRING,
  metadata          STRING,              -- JSON
  run_at            TIMESTAMP NOT NULL DEFAULT current_timestamp()
)
USING DELTA
PARTITIONED BY (DATE(run_at))
TBLPROPERTIES ('delta.autoOptimize.optimizeWrite' = 'true');

-- ─── VIEWS ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_weekly_school_summary AS
SELECT
  school_id,
  DATE_TRUNC('week', metric_date)       AS week_start,
  AVG(attendance_pct)                   AS avg_attendance_pct,
  SUM(fees_collected_inr)               AS total_fees_collected,
  SUM(new_admissions)                   AS total_new_admissions,
  AVG(CAST(present_today AS DOUBLE) / NULLIF(total_students,0) * 100) AS avg_daily_presence
FROM daily_school_metrics
GROUP BY 1, 2;

CREATE OR REPLACE VIEW v_monthly_revenue AS
SELECT
  DATE_FORMAT(billing_date, 'yyyy-MM')  AS month,
  SUM(mrr_contribution)                 AS total_mrr,
  SUM(arr_contribution)                 AS total_arr,
  COUNT(DISTINCT school_id)             AS paying_schools
FROM revenue_analytics
WHERE payment_status = 'paid'
GROUP BY 1
ORDER BY 1;
