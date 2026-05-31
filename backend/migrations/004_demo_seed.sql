-- LD Schools — Demo Seed Data
-- Creates a demo school with teachers, students, classes so login works immediately.
-- Safe to re-run — uses ON CONFLICT DO NOTHING.

-- ── Demo School ───────────────────────────────────────────────────────────────
INSERT INTO schools (id, name, location, plan_type, join_code) VALUES
  ('00000000-0000-0000-0000-000000000001',
   'LD Demo Public School', 'Bangalore, Karnataka', 'pro', 'DEMO01')
ON CONFLICT (id) DO NOTHING;

-- ── Demo Users ────────────────────────────────────────────────────────────────
-- Passwords are all: demo1234
-- bcrypt hash of "demo1234" with 10 rounds
INSERT INTO users (id, name, email, password_hash, role, school_id) VALUES
  ('00000000-0000-0000-0001-000000000001',
   'Demo Admin',   'admin@demo.ldschools.app',
   '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
   'school_admin', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0001-000000000002',
   'Demo Teacher', 'teacher@demo.ldschools.app',
   '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
   'teacher', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0001-000000000003',
   'Demo Student', 'student@demo.ldschools.app',
   '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
   'student', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0001-000000000004',
   'Demo Parent',  'parent@demo.ldschools.app',
   '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
   'parent', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ── Demo Classes ─────────────────────────────────────────────────────────────
INSERT INTO classes (id, school_id, teacher_id, name, grade, section) VALUES
  ('00000000-0000-0000-0002-000000000001',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0001-000000000002',
   'Grade 5-A', 5, 'A'),
  ('00000000-0000-0000-0002-000000000002',
   '00000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0001-000000000002',
   'Grade 6-B', 6, 'B')
ON CONFLICT (id) DO NOTHING;

-- ── Demo Students ─────────────────────────────────────────────────────────────
INSERT INTO users (id, name, email, password_hash, role, school_id) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Arjun Sharma',   'arjun@demo.ldschools.app',   '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'student', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'Priya Nair',     'priya@demo.ldschools.app',   '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'student', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000003', 'Rahul Mehta',    'rahul@demo.ldschools.app',   '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'student', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000004', 'Sneha Patel',    'sneha@demo.ldschools.app',   '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'student', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000005', 'Aditya Kumar',   'aditya@demo.ldschools.app',  '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'student', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000006', 'Meera Singh',    'meera@demo.ldschools.app',   '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'student', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000007', 'Ravi Iyer',      'ravi@demo.ldschools.app',    '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'student', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000008', 'Anjali Rao',     'anjali@demo.ldschools.app',  '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'student', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000009', 'Vikram Gupta',   'vikram@demo.ldschools.app',  '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'student', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000010', 'Deepa Krishnan', 'deepa@demo.ldschools.app',   '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'student', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- ── Student profiles (with LD data) ──────────────────────────────────────────
INSERT INTO students (user_id, age, class_grade, ld_type, ld_risk_score, current_level, streak_count, last_screened_at) VALUES
  ('10000000-0000-0000-0000-000000000001', 11, 5, 'dyslexia',    78, 1, 3,  NOW() - INTERVAL '5 days'),
  ('10000000-0000-0000-0000-000000000002', 12, 6, NULL,          NULL, 1, 0, NULL),
  ('10000000-0000-0000-0000-000000000003', 13, 7, 'mixed',       65, 2, 7,  NOW() - INTERVAL '12 days'),
  ('10000000-0000-0000-0000-000000000004', 11, 5, NULL,          NULL, 1, 0, NULL),
  ('10000000-0000-0000-0000-000000000005', 14, 8, 'dyscalculia', 72, 1, 2,  NOW() - INTERVAL '8 days'),
  ('10000000-0000-0000-0000-000000000006', 12, 6, 'not_detected',12, 3, 14, NOW() - INTERVAL '20 days'),
  ('10000000-0000-0000-0000-000000000007', 11, 5, 'dyslexia',    55, 2, 5,  NOW() - INTERVAL '15 days'),
  ('10000000-0000-0000-0000-000000000008', 12, 6, NULL,          NULL, 1, 0, NULL),
  ('10000000-0000-0000-0000-000000000009', 13, 7, 'dysgraphia',  48, 2, 9,  NOW() - INTERVAL '3 days'),
  ('10000000-0000-0000-0000-000000000010', 11, 5, 'not_detected', 8, 4, 21, NOW() - INTERVAL '30 days')
ON CONFLICT (user_id) DO NOTHING;

-- ── Assign students to class ──────────────────────────────────────────────────
INSERT INTO class_students (class_id, student_id) VALUES
  ('00000000-0000-0000-0002-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0002-000000000001', '10000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0002-000000000001', '10000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0002-000000000001', '10000000-0000-0000-0000-000000000007'),
  ('00000000-0000-0000-0002-000000000001', '10000000-0000-0000-0000-000000000008'),
  ('00000000-0000-0000-0002-000000000002', '10000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0002-000000000002', '10000000-0000-0000-0000-000000000006'),
  ('00000000-0000-0000-0002-000000000002', '10000000-0000-0000-0000-000000000009'),
  ('00000000-0000-0000-0002-000000000002', '10000000-0000-0000-0000-000000000010')
ON CONFLICT DO NOTHING;

-- ── Demo Staff ────────────────────────────────────────────────────────────────
INSERT INTO users (id, name, email, password_hash, role, school_id, phone) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Ravi Shankar',   'ravi.teacher@demo.ldschools.app',   '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'teacher', '00000000-0000-0000-0000-000000000001', '9876543201'),
  ('20000000-0000-0000-0000-000000000002', 'Lakshmi Devi',   'lakshmi.teacher@demo.ldschools.app', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'teacher', '00000000-0000-0000-0000-000000000001', '9876543202'),
  ('20000000-0000-0000-0000-000000000003', 'Anita Rao',      'anita.teacher@demo.ldschools.app',   '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'teacher', '00000000-0000-0000-0000-000000000001', '9876543203')
ON CONFLICT (id) DO NOTHING;

-- ── Demo Attendance (last 7 days) ─────────────────────────────────────────────
INSERT INTO student_attendance (student_id, class_id, date, status, marked_by)
SELECT s.user_id,
       '00000000-0000-0000-0002-000000000001',
       CURRENT_DATE - offs,
       CASE WHEN random() > 0.1 THEN 'present' ELSE 'absent' END,
       '00000000-0000-0000-0001-000000000002'
FROM students s
CROSS JOIN generate_series(0, 6) AS offs
WHERE s.user_id IN (
  SELECT student_id FROM class_students WHERE class_id = '00000000-0000-0000-0002-000000000001'
)
ON CONFLICT (student_id, date) DO NOTHING;

-- ── Demo Fee Outstanding ──────────────────────────────────────────────────────
INSERT INTO fee_outstanding (student_id, school_id, total_due, total_paid) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 12000, 8000),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 12000, 0),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 15000, 15000),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 12000, 6000),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 18000, 18000)
ON CONFLICT (student_id) DO NOTHING;

-- ── Demo Fee Transactions ─────────────────────────────────────────────────────
INSERT INTO fee_transactions (id, school_id, student_id, amount, payment_mode, receipt_no, collected_by, created_at) VALUES
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 8000,  'cash',  'RCP-0001', '00000000-0000-0000-0001-000000000001', NOW() - INTERVAL '5 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 15000, 'upi',   'RCP-0002', '00000000-0000-0000-0001-000000000001', NOW() - INTERVAL '3 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 6000,  'card',  'RCP-0003', '00000000-0000-0000-0001-000000000001', NOW() - INTERVAL '1 day'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 18000, 'cash',  'RCP-0004', '00000000-0000-0000-0001-000000000001', NOW())
ON CONFLICT DO NOTHING;

-- ── Demo Exam ─────────────────────────────────────────────────────────────────
INSERT INTO exams (id, school_id, name, exam_type, start_date, end_date) VALUES
  ('30000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'Unit Test 1 — May 2026', 'unit_test',
   CURRENT_DATE - INTERVAL '10 days',
   CURRENT_DATE - INTERVAL '8 days')
ON CONFLICT (id) DO NOTHING;

-- ── Demo Admission Enquiries ──────────────────────────────────────────────────
INSERT INTO admission_enquiries (id, school_id, student_name, parent_name, parent_phone, grade, source, status, created_at) VALUES
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'Aarush Jain',   'Rajesh Jain',  '9876500011', 5, 'walk_in',  'new',       NOW() - INTERVAL '2 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'Diya Shah',     'Nita Shah',    '9876500012', 3, 'website',  'contacted', NOW() - INTERVAL '5 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'Vivan Gupta',   'Sanjay Gupta', '9876500013', 8, 'referral', 'visited',   NOW() - INTERVAL '7 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'Ira Mehta',     'Pooja Mehta',  '9876500014', 1, 'walk_in',  'enrolled',  NOW() - INTERVAL '10 days'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'Kabir Verma',   'Amit Verma',   '9876500015', 6, 'website',  'new',       NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- ── Demo Notifications ────────────────────────────────────────────────────────
INSERT INTO notifications (id, user_id, school_id, type, title, body, is_read, created_at) VALUES
  (uuid_generate_v4(), '00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'announcement',        'Fee Due Alert',           '3 students have fees overdue by more than 30 days', false, NOW() - INTERVAL '2 hours'),
  (uuid_generate_v4(), '00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'screening_reminder',  'Attendance Alert',        'Grade 5-A attendance below 75% this week',          false, NOW() - INTERVAL '5 hours'),
  (uuid_generate_v4(), '00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'recommendation',      'New Student Enrolled',    'Ira Mehta enrolled in Grade 5-A',                   true,  NOW() - INTERVAL '1 day'),
  (uuid_generate_v4(), '00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'level_up',            'Level Up!',               'You reached Level 2 — Basic. Keep going!',          false, NOW() - INTERVAL '3 hours'),
  (uuid_generate_v4(), '00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'practice_reminder',   'Practice Time!',          'You have not practiced today. Keep your streak!',   false, NOW() - INTERVAL '6 hours')
ON CONFLICT DO NOTHING;

-- ── Demo Circulars ────────────────────────────────────────────────────────────
INSERT INTO circulars (id, school_id, title, body, audience, created_by, created_at) VALUES
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'Annual Sports Day — 15 June 2026',
   'Dear Parents, we are pleased to announce our Annual Sports Day on 15 June 2026. All students must report by 8:00 AM in sports attire. Refreshments will be provided.',
   'all', '00000000-0000-0000-0001-000000000001', NOW() - INTERVAL '3 hours'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'Term 2 Fee Payment Reminder',
   'This is a reminder that Term 2 fees are due by 31 May 2026. Parents who have not yet paid are requested to clear dues at the school office between 9 AM and 3 PM.',
   'parents', '00000000-0000-0000-0001-000000000001', NOW() - INTERVAL '1 day'),
  (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'Summer Vacation — 1 June to 30 June',
   'School will remain closed from 1 June to 30 June 2026 for Summer Vacation. School reopens on 1 July 2026.',
   'all', '00000000-0000-0000-0001-000000000001', NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- ── Update demo login to use a valid bcrypt hash ──────────────────────────────
-- Password: demo1234 — real bcrypt hash generated here
UPDATE users SET password_hash = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW'
WHERE email LIKE '%@demo.ldschools.app'
  AND password_hash = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW';

