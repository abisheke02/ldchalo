# LD Support Platform — Build Progress

---

## How to Run on Your Own Server (Docker)

### Why login was breaking
Every login failure traced to one of these:
1. **Redis not running** — backend tried to check token blacklist, hung
2. **Migrations not applied** — DB tables didn't exist, queries returned 500
3. **JWT_SECRET missing** — token signing failed silently
4. **Wrong Supabase keys** — OTP never sent
5. **CORS mismatch** — `ALLOWED_ORIGINS` didn't match the browser's origin

All of these are now fixed: migrations run automatically on every startup, Redis failure is graceful, and JWT_SECRET is validated at boot.

---

### One-time server setup

```bash
# 1. Install Docker on your server (Ubuntu/Debian)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in

# 2. Clone / copy the project to your server
git clone <your-repo> ld-platform
cd ld-platform

# 3. Create your .env file from the template
cp .env.example .env
nano .env          # fill in every value — see comments in the file

# 4. Generate a strong JWT secret (paste into .env)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 5. Build and start everything
docker compose up -d --build

# 6. Check all containers are running
docker compose ps

# 7. Watch startup logs (migrations + connections)
docker compose logs -f backend
```

### After that, your app is live at:
- Web dashboard: `http://YOUR_SERVER_IP`
- API: `http://YOUR_SERVER_IP/api/health`

---

### Daily operations

```bash
# Start containers
docker compose up -d

# Stop containers (data is preserved)
docker compose down

# View logs
docker compose logs -f backend     # backend only
docker compose logs -f             # all services

# Restart just the backend (after code changes)
docker compose up -d --build backend

# Delete ALL data and start fresh (⚠ irreversible)
docker compose down -v
docker compose up -d --build
```

---

### Where data lives

| Data | Location |
|---|---|
| PostgreSQL tables | Docker volume `postgres_data` — survives restarts |
| Redis cache | Docker volume `redis_data` — survives restarts |
| JWT tokens | Browser `localStorage` (web) / `AsyncStorage` (mobile) |
| Supabase user accounts | Supabase cloud (not on your server) |
| Firebase user accounts | Firebase cloud (not on your server) |

**To back up your database:**
```bash
docker exec ld_postgres pg_dump -U ld_user ld_platform > backup_$(date +%Y%m%d).sql
```

**To restore:**
```bash
cat backup_20260428.sql | docker exec -i ld_postgres psql -U ld_user ld_platform
```

---

### Keys you need before going live

| Key | Where to get it |
|---|---|
| `SUPABASE_URL` + `SUPABASE_ANON_KEY` | supabase.com → your project → Settings → API |
| `JWT_SECRET` | Generate locally (see step 4 above) |
| `DB_PASSWORD` | Choose any strong password |
| `ADMIN_PASSWORD` | Choose your admin login password |
| `RAZORPAY_KEY_ID/SECRET` | razorpay.com → Settings → API Keys |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| Firebase keys | console.firebase.google.com → Service Accounts |

Supabase and Firebase are free-tier cloud services — you don't need to self-host them.

---

## What's Done

### Phase 1 — Foundation
- PostgreSQL schema: users, schools, classes, students, exercises, test_questions, sessions, errors
- Express backend with helmet, CORS, rate limiting, JWT auth
- Firebase phone OTP (mobile) + Supabase phone/email OTP (web)
- Offline SQLite cache with sync queue (React Native)
- Docker Compose for local dev (Postgres 5433, Redis 6380)

### Phase 2 — LD Screening & Classification
- 20-question adaptive screening quiz (mobile)
- Rule-based classifier + Claude claude-sonnet-4-6 merge (Claude wins at ≥70% confidence)
- LD types: dyslexia, dysgraphia, dyscalculia, mixed, not_detected
- Risk score 0–100; result stored in screening_sessions table
- Re-screening every 90 days (cron job)

### Phase 3 — Practice Engine
- Phonics, reading, writing, math exercise modules (mobile)
- Elo-style adaptive difficulty: >80% score → harder, <50% → easier
- Every wrong answer stored in student_errors with error_type
- ReadAloud exercise with on-device TTS + STT scoring (react-native-voice)
- STT voice-answer support in mobile TestQuizScreen
- Offline practice with sync queue

### Phase 4 — Test System & AI Recommendations
- 5-level test system, 70% threshold to unlock next level
- Level history permanent audit trail
- Claude-powered AI recommendations (student/teacher/parent audience)
- Weekly recommendation cron job

### Phase 5 — Analytics, Dashboards, Messaging
- Teacher web dashboard: class list, student list, at-risk detection
- StudentDetailPage: 14-day score trend, weak area bars, PDF report download
- ClassDetailPage: tabbed All/Needs Attention with at-risk API
- Admin Dashboard: LD pie chart, school bar chart, subscription table, manual cron triggers
- Parent Scorecard (/parent): mobile-web, 7-day activity calendar, AI tip
- Messaging UI: teacher↔parent chat with 5-second polling
- StudentDashboard (mobile): streak, daily stats, SparkBar trend
- Google Cloud TTS (en-IN-Wavenet-D) hear-question button in web TestQuiz
- SpeakingInput (Web Speech API) for speaking-type questions

### Phase 6 — Payments, Security, Compliance, Onboarding
- Razorpay integration: create-order → Razorpay checkout → verify signature → activate subscription
- Razorpay webhook handler (payment.captured / payment.failed)
- JWT refresh tokens: 24h access + 30d refresh, rotation on use, stored hashed in DB
  - POST /api/auth/refresh endpoint
  - Web and mobile axios interceptors with concurrent-request queuing
- Fixed: loginWithSupabaseToken handles both phone AND email OTP
- Parent login tab added to LoginPage (navigates to /parent on success)
- ConsentModal shown to new users (DPDP compliance), records via POST /compliance/consent
- Admin CMS at /admin/cms — exercise and question CRUD
- Subscription banner + upgrade modal in teacher dashboard
- Mixpanel analytics wired: login, demo login, test, practice, upgrade, CMS, page views
- Backend startup: fails fast on missing JWT_SECRET
- DPDP compliance routes: consent record, data export, right-to-forget (anonymise PII)

### Pilot Launch Onboarding (current sprint)
- School self-registration: POST /api/schools/register (creates school, assigns creator as teacher)
- School join code (6-char): teachers use to join an existing school
- Teacher invite system: POST /api/schools/invite-teacher → 7-day invite link
  - InviteAcceptPage (/invite/:token) auto-accepts after login
- Parent linking: teacher links parent phone/email to student
  - Parent logs in → child_id auto-wired via resolveParentLink in authService
- 3-step OnboardingWizard for new teachers (register/join school → create class → share codes)
- SchoolSettingsPage (/settings): join codes, teacher list, invite teacher, link parent
- Migration 006: school join_code, teacher_invites, parent_student_links tables

---

## What's Pending

### Google Play Store (need to buy developer account — $25)
- Generate android/ directory: `npx react-native init`
- Run `mobile/scripts/setup-android-release.sh` to create keystore + signing config
- Build release AAB: `cd android && ./gradlew bundleRelease`
- Upload to Google Play Console (play.google.com/console)
- Need: package name (e.g. com.ldplatform.india), store listing screenshots/description

### Production Deployment
- Docker Compose production config (separate from dev)
- Nginx reverse proxy config + SSL (Let's Encrypt)
- Environment secrets management (not .env files in prod)
- CI/CD pipeline (GitHub Actions: test → build → deploy)
- Production PostgreSQL (Supabase or RDS) + Redis (Upstash or ElastiCache)
- Domain setup + DNS

### Performance
- DB index audit on high-traffic queries
- Query optimisation (N+1 checks in analytics routes)
- Load testing setup (k6 or Artillery, target 10k concurrent)
- Read replica for analytics queries

### Mobile Screens (missing)
- ProfileSetupScreen — already exists, needs review
- Notifications screen (list push notifications)
- Parent contact / messaging screen in mobile
- Offline indicator + sync status banner

### Real API Keys Needed (to replace placeholders in backend/.env)
- RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET (razorpay.com → Settings → API Keys)
- GOOGLE_APPLICATION_CREDENTIALS (Google Cloud Console → Service Account → TTS API)
- TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE (twilio.com)
- ADMIN_USERNAME / ADMIN_PASSWORD (change from defaults before going live)

### Pilot Launch Checklist
- [ ] Register 2–3 schools in production using /api/schools/register
- [ ] Verify Supabase OTP works with real phone numbers
- [ ] Run all 6 migrations on production DB
- [ ] Set ALLOWED_ORIGINS to production domain
- [ ] Verify Razorpay test keys → switch to live keys
- [ ] Send first parent scorecard links to pilot families
