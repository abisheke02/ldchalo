# School Management Platform — Implementation Plan
## Inspired by Chalo Schools Automated (Academic Year 2024–25)

---

## WHAT WE ARE BUILDING

A full-stack, AI-powered School Management Automation Platform covering:
- Student & Staff lifecycle management
- Fee collection with 3 methods + smart reconciliation
- Timetable auto-generation
- Examination & digital report cards
- Parent/Teacher communication
- Analytics & compliance dashboards
- Mobile apps for Parents, Teachers, Management

---

## TECH STACK

| Layer | Technology |
|-------|-----------|
| Backend API | Node.js 20 + Express 5 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Frontend Web | React 18 + Vite + Tailwind CSS |
| Mobile | React Native (Android-first) |
| AI | Claude API (claude-sonnet-4-6) |
| Payments | Razorpay (UPI/Cards/Netbanking) |
| Auth | JWT + Supabase Phone OTP |
| Notifications | Firebase FCM + WhatsApp Cloud API |
| PDF Generation | PDFKit |
| Deployment | Docker Compose |

---

## MODULE BREAKDOWN — ALL 20 MODULES

### PHASE 1 — CORE FOUNDATION (Weeks 1–4)
**Priority: MUST BUILD FIRST**

#### 1. Multi-Tenant School Setup
- School registration (name, logo, address, board type: CBSE/IGCSE/State)
- Academic year management (2024–25, term configuration)
- Class & section creation (Grade I-A, I-B, etc.)
- Role-based access: Super Admin / School Admin / Principal / Teacher / Parent / Student
- School-level configuration (working days, periods, break times)

**Tables:** `schools`, `academic_years`, `terms`, `classes`, `sections`, `roles`, `users`

#### 2. Authentication Module
- Phone OTP login (Supabase) for Teachers & Parents
- Student login via parent-linked account
- Admin login (username + password)
- JWT + refresh tokens (Redis blacklist)
- Role-based route guards

**Tables:** `users`, `refresh_tokens`, `otp_verifications`

#### 3. Student Management
- Complete student profile (name, DOB, photo, blood group, parent details)
- Admission number auto-generation
- Class assignment & transfer
- Alumni tracking (graduated students)
- Digital Profile Builder (documents: TC, birth certificate, etc.)
- Student history (class changes, fee history, attendance history)

**Tables:** `students`, `student_documents`, `student_class_history`, `parents`

#### 4. Staff Management
- Staff profiles (teaching, non-teaching, admin, outsource)
- Department & subject assignments
- Real-time attendance tracking (present/absent/half-day/on-duty/late/leave)
- Leave management (leave types, apply, approve, balance)
- Biometric integration hooks (device registration, punch-in/out)
- Role mapping (Class Teacher, Subject Teacher, Lab Teacher)

**Tables:** `staff`, `departments`, `subjects`, `staff_attendance`, `leave_requests`, `leave_balances`

---

### PHASE 2 — ADMISSION & ACADEMICS (Weeks 5–8)

#### 5. Admission Management
- Online enquiry form (digital admission process)
- Enquiry → Application → Interview → Admission funnel
- Document checklist & upload
- Admission quota tracking (Management/Local/General)
- Sibling & staff-child concession flags
- Bulk import via Excel

**Tables:** `admission_enquiries`, `admission_applications`, `admission_documents`, `quotas`

#### 6. Attendance Management
- Student daily attendance (class-wise, period-wise)
- One-click bulk mark (present/absent)
- Late arrival tracking
- Parent notification on absence (WhatsApp/SMS)
- Monthly attendance report
- Biometric sync for staff attendance
- Minimum attendance alerts (below 75%)

**Tables:** `student_attendance`, `attendance_periods`, `attendance_notifications`

#### 7. Timetable Management (AI-Powered)
- Rule configuration: teacher–subject–class mapping
- One-click auto-generation (constraint-based)
- Conflict detection (no double-booking of teacher/room)
- AI substitution: auto-fill absent teacher's periods
- Period drag-and-drop gap management
- Export as PDF per class
- 80% time saved vs manual

**Tables:** `timetable_rules`, `timetable_slots`, `timetable_substitutions`, `rooms`

#### 8. Academic & Examination Module
- Exam planner (term-wise, online distribution to parents)
- Marks entry via Teachers App (5 mins/student via AnsApp concept)
- Mark sheet generation (consolidated class-wise)
- Digital Report Card (CBSE / IGCSE / State board formats)
- Performance chart (auto-generated graphical view)
- AI-rephrased teacher remarks
- Grade calculation engine (A1/A2/B1/B2/C1/C2 mapping)
- No separate mark register needed (printout from system)

**Tables:** `exams`, `exam_schedules`, `marks`, `report_cards`, `grade_config`, `teacher_remarks`

---

### PHASE 3 — FEE MANAGEMENT (Weeks 9–11)
**Priority: HIGH — Core Revenue Module**

#### 9. Fee Structure Setup
- Fee heads configuration (Tuition, Security Deposit, ECA, Book Fee, etc.)
- Term-wise fee assignment per class/section
- Concession categories (Sibling, Staff Child, Management Quota, Full Payment Discount)
- Late fee penalty configuration

**Tables:** `fee_heads`, `fee_structures`, `fee_concessions`, `concession_categories`

#### 10. Fee Collection — 3 Methods
**Method 1: Challan**
- Auto-generate challan PDF with school bank details
- Parent pays at bank
- Bank statement upload → automated reconciliation
- Challan number linking

**Method 2: Counter**
- Walk-in payment at school counter
- Instant receipt generation
- Real-time End-of-Day (EOD) report

**Method 3: Online**
- Razorpay integration (Debit/Credit/UPI/Netbanking)
- Parent portal + mobile app payment
- Instant email receipt
- Webhook-based auto-reconciliation

**Tables:** `fee_transactions`, `fee_receipts`, `challans`, `bank_statements`, `payment_reconciliation`

#### 11. Fee Intelligence (AI)
- Smart reconciliation: student-ID-wise bank statement matching
- Duplicate payment detection & alerts
- Outstanding fee auto-calculation
- Class-wise O/S report generation
- AI fee tracker: ensures 100% receipt generation
- 50–60% collection improvement tracking

**Tables:** `fee_outstanding`, `reconciliation_jobs`, `duplicate_payment_alerts`

---

### PHASE 4 — COMMUNICATION (Weeks 12–14)

#### 12. Communication Management
- Circular / Notice creation (school-wide or class-specific)
- AI Communication Assistant: rephrase homework/assignment notes
- Push notifications (FCM) to Parent App
- WhatsApp automated messages (fee reminders, attendance alerts, circulars)
- SMS fallback (Twilio)
- Personalised wishes (exam wishes, birthdays) via mobile app

**Tables:** `circulars`, `notice_recipients`, `notification_logs`, `whatsapp_templates`

#### 13. Parent Portal & Teacher Web App
- Parent: view ward's attendance, fees, report card, circulars
- Teacher: mark attendance, enter marks, view class roster
- Principal: timetable management, substitution approval
- Admin: fee collection dashboard, reports

#### 14. Mobile Apps (3 Apps)
**Parent App (Chaloschools):**
- OTP login
- Child's daily attendance
- Fee payment (Razorpay)
- Report card download
- Circular notifications
- Personalised wishes

**Teachers App (AnsApp):**
- Mark attendance (one tap)
- Marks entry (5 min/student)
- Circular creation
- Substitution notifications

**Management App (C-365):**
- Live dashboard metrics
- Fee collection status
- Staff attendance overview
- Key alerts

---

### PHASE 5 — REPORTS & COMPLIANCE (Weeks 15–16)

#### 15. Analytics Dashboard (Live Metrics)
- Total students (with new-this-term count)
- Fees collected vs outstanding (with % progress bars)
- Staff attendance overview (present/absent/half-day)
- Class-wise student attendance chart
- Real-time EOD fee updates

#### 16. Reports Module
- Class-wise fee outstanding report
- Fee concession report (with concession %)
- Student attendance report (monthly/term)
- Mark register / consolidated mark sheet
- Staff attendance report
- Custom date-range reports
- Excel + PDF export

#### 17. Compliance & Audit
- IT Act 2000 audit trail (every data change logged with user + timestamp)
- OTP verification for master data changes (Digital OTP Protection)
- DPDP consent management
- Role-level access logs

**Tables:** `audit_logs`, `data_change_requests`, `otp_verifications`

---

### PHASE 6 — ADD-ON MODULES (Weeks 17–22)

#### 18. Payroll Management
- Staff salary structure (basic, HRA, DA, allowances)
- Monthly payroll generation
- Deductions (PF, ESI, TDS, leaves)
- Payslip generation (PDF)
- Tally integration export

**Tables:** `salary_structures`, `payroll_runs`, `payslips`, `deductions`

#### 19. Library Management
- Book catalogue (ISBN, author, subject, copies)
- Issue & return tracking
- Student self-service (view availability)
- Fine calculation (overdue)
- Reports (most issued, overdue list)

**Tables:** `books`, `book_copies`, `book_issues`, `library_fines`

#### 20. Transport Management
- Route & stop management
- Vehicle allocation (bus/van)
- Student transport assignment
- GPS integration hooks (live tracking)
- Parent tracking app view
- Monthly transport fee integration

**Tables:** `routes`, `stops`, `vehicles`, `student_transport`, `driver_attendance`

---

## AI FEATURES (Cross-Cutting)

| Feature | Claude API Usage | When |
|---------|-----------------|------|
| Timetable Generator | Constraint satisfaction + conflict resolution | Phase 2 |
| AI Result Analysis | 360° performance insights, weak-subject detection | Phase 2 |
| AI Communication Assistant | Rephrase homework/circular text | Phase 4 |
| Smart Fee Reconciliation | Bank statement → student ID matching | Phase 3 |
| AI Fee Intelligence | Detect revenue gaps, missing receipts | Phase 3 |
| Substitution Suggestions | Optimal teacher–period match on absence | Phase 2 |

---

## DATABASE SCHEMA SUMMARY

### Core Tables (Phase 1)
```
schools → academic_years → terms
users (roles: admin/teacher/parent/student)
students → parents (linked)
staff → departments → subjects
classes → sections → class_students
```

### Academic Tables (Phase 2)
```
timetable_rules → timetable_slots → timetable_substitutions
student_attendance (date × student × period)
exams → exam_schedules → marks → report_cards
```

### Finance Tables (Phase 3)
```
fee_heads → fee_structures (per class/term)
fee_concessions (per student)
fee_transactions → fee_receipts
challans / bank_statements → reconciliation
```

### Communication Tables (Phase 4)
```
circulars → notice_recipients
notification_logs (FCM/WhatsApp/SMS)
whatsapp_templates
```

### Add-on Tables (Phase 6)
```
salary_structures → payroll_runs → payslips
books → book_copies → book_issues
routes → vehicles → student_transport
```

---

## FOLDER STRUCTURE

```
school-mgmt/
├── backend/
│   ├── src/
│   │   ├── config/         database, redis, migrations
│   │   ├── routes/         14 route files (one per module)
│   │   ├── services/       business logic (AI, fees, timetable)
│   │   └── middleware/     auth, error, audit logging
│   └── migrations/         SQL schema files
├── web/
│   └── src/
│       ├── pages/          one folder per module
│       ├── components/     shared UI (Sidebar, Header, Table)
│       └── services/       API client, auth store
├── mobile/                 React Native (Phase 4+)
├── docker-compose.yml
└── .env.example
```

---

## DEVELOPMENT MILESTONES

| Phase | Weeks | Modules | Status |
|-------|-------|---------|--------|
| 1 — Core | 1–4 | Auth, School Setup, Students, Staff | TODO |
| 2 — Academics | 5–8 | Admissions, Attendance, Timetable, Exams | TODO |
| 3 — Finance | 9–11 | Fee Structure, 3-Method Collection, AI Reconciliation | TODO |
| 4 — Communication | 12–14 | Circulars, WhatsApp, Parent Portal, Mobile | TODO |
| 5 — Reports | 15–16 | Analytics Dashboard, Reports, Compliance | TODO |
| 6 — Add-ons | 17–22 | Payroll, Library, Transport, GPS, Tally | TODO |

---

## COMPETITOR DIFFERENTIATION (from Chalo Report)

| Competitor | Their Strength | Our Edge |
|-----------|---------------|----------|
| Entab | 15–20% India ERP market share | Simpler UI, lower TCO |
| Fedena | Open-source, 50+ features | Better fee digitalisation |
| MyClassboard | South India K-12 | 80% faster timetable (AI) |
| Teachmint | Strong LMS | Deeper admin & fees automation |
| Schezy | Face recognition, minimal UX | Proven 50–60% fee collection improvement |
