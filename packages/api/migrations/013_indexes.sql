-- ─── Performance Indexes ──────────────────────────────────────────────────────
-- Covers high-traffic query patterns across both LD and school-ERP modules.
-- All created with IF NOT EXISTS so safe to re-run.

-- ── Users & Auth ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role         ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_school_role  ON users(school_id, role);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

-- ── Students ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_students_teacher   ON students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_class     ON students(class_grade);
CREATE INDEX IF NOT EXISTS idx_class_students_class   ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student ON class_students(student_id);

-- ── Screening ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_screening_sessions_user   ON screening_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_screening_sessions_status ON screening_sessions(status);
CREATE INDEX IF NOT EXISTS idx_screening_questions_type  ON screening_questions(question_type);

-- ── Practice ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user    ON practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_created ON practice_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_practice_session_exercises_session ON practice_session_exercises(session_id);
CREATE INDEX IF NOT EXISTS idx_exercises_type_level      ON exercises(type, level);
CREATE INDEX IF NOT EXISTS idx_student_errors_user       ON student_errors(user_id);
CREATE INDEX IF NOT EXISTS idx_student_errors_type       ON student_errors(error_type);

-- ── Test Attempts ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_test_attempts_user        ON test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_level       ON test_attempts(level);
CREATE INDEX IF NOT EXISTS idx_test_attempts_created     ON test_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_questions_level_type ON test_questions(level, question_type);

-- ── Recommendations ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user      ON ai_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_class     ON ai_recommendations(class_id) WHERE class_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_created   ON ai_recommendations(created_at DESC);

-- ── Messages ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_messages_sender    ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver  ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread    ON messages(sender_id, receiver_id, created_at DESC);

-- ── Analytics ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_analytics_events_user    ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_school  ON analytics_events(school_id) WHERE school_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_type    ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_stats_school_date  ON daily_stats(school_id, date DESC);

-- ── Offline Sync ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_offline_sync_user   ON offline_sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_sync_status ON offline_sync_queue(status);

-- ── School ERP: Attendance ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_student_attendance_class_date ON student_attendance(class_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_student_attendance_student    ON student_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_date       ON student_attendance(date DESC);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_date   ON staff_attendance(staff_id, date DESC);

-- ── School ERP: Fees & Finance ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fee_transactions_student  ON fee_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_transactions_school   ON fee_transactions(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_transactions_created  ON fee_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fee_outstanding_student   ON fee_outstanding(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_outstanding_school    ON fee_outstanding(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_receipts_student      ON fee_receipts(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_student    ON payment_orders(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status     ON payment_orders(status);

-- ── School ERP: Academic ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_marks_student       ON marks(student_id);
CREATE INDEX IF NOT EXISTS idx_marks_exam          ON marks(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_exam ON exam_schedules(exam_id);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_class ON timetable_slots(class_id);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_teacher ON timetable_slots(teacher_id) WHERE teacher_id IS NOT NULL;

-- ── School ERP: Staff ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_staff_school        ON staff(school_id);
CREATE INDEX IF NOT EXISTS idx_staff_dept          ON staff(department_id) WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_subjects_staff ON staff_subjects(staff_id);

-- ── School ERP: Admissions ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_admission_enquiries_school  ON admission_enquiries(school_id);
CREATE INDEX IF NOT EXISTS idx_admission_enquiries_status  ON admission_enquiries(status);
CREATE INDEX IF NOT EXISTS idx_admission_enquiries_created ON admission_enquiries(created_at DESC);

-- ── School ERP: Communications ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_school  ON notifications(school_id) WHERE school_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_read    ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_circulars_school      ON circulars(school_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_recipient ON notification_logs(recipient_id);

-- ── School ERP: Transport ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_student_transport_student ON student_transport(student_id);
CREATE INDEX IF NOT EXISTS idx_student_transport_route   ON student_transport(route_id);

-- ── Audit / Compliance ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_logs_user    ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consent_records_user ON consent_records(user_id);
