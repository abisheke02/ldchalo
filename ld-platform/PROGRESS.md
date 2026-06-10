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

### Monorepo Unification (completed 2026-05-28)
- Unified API (`packages/api/`) replaces deprecated `packages/ld-api/` and `packages/school-api/`
- Fixed all 24 module require-path bugs (modules 2 levels deep need `../../` not `../`)
- Created `packages/api/migrations/` with all 12 migrations (001–012), renumbered school ERP migrations as 009–012
- Fixed API Dockerfile to COPY migrations/ alongside src/
- Fixed Nginx upstream: `backend:3000` → `api:3000` (matches docker-compose service name)
- Fixed all frontend/mobile API route paths:
  - `apps/school-erp-web` pages: added `/school/` prefix to all school ERP routes
  - `apps/school-erp-web` LoginPage: removed broken phone-OTP flow, uses `/auth/credentials` (admin) and `/auth/login` (teacher)
  - `apps/ld-exam-web` services/api.js: added `/ld/` prefix to all LD-specific routes
  - `apps/ld-exam-mobile` services/api.js: added `/ld/` prefix to all LD-specific routes
  - `apps/school-mobile` services/api.js: fully rewritten to match actual API routes
  - `apps/school-mobile` LoginScreen: switched from OTP (not implemented) to email+password
  - `apps/school-mobile` AttendanceScreen: added class picker UI
- Added missing `GET /analytics/dashboard` endpoint for school-mobile dashboard stats
- Fixed `adminAPI.triggerCron` path: `/admin/cron/${job}` → `/admin/cron/trigger/${job}`
- Added all missing `.env.example` variables (SUPABASE_ANON_KEY, HTTP_PORT, HTTPS_PORT, etc.)

### CI/CD & Infrastructure (completed 2026-05-28)
- `.github/workflows/ci.yml`: lint, API check, web builds, desktop renderer check, Docker build
- `.github/workflows/deploy.yml`: build + push images to GHCR, SSH deploy to staging/production
- `packages/api/migrations/013_indexes.sql`: 65 performance indexes across all high-traffic tables
- `desktop/ld-exam-desktop`: completed main process IPC (API URL config, network probe, auth token store, shell:openExternal), preload.js, production renderer shell, `scripts/build-renderer.js` embed script

### Mobile Screens Added (completed 2026-05-28)
- `apps/ld-exam-mobile/src/screens/notifications/NotificationsScreen.js`: full notification list with mark-read, mark-all-read, pull-to-refresh, time-ago labels
- `apps/ld-exam-mobile/src/screens/messages/MessagesScreen.js`: conversation list + threaded message view with optimistic sends and keyboard-avoiding layout
- `apps/ld-exam-mobile/src/components/OfflineBanner.js`: animated slide-in/out banner on connectivity changes; "back online" auto-dismiss after 2.2s
- Navigation: Messages tab added, Notifications screen added to stack, notification bell on StudentDashboard header, OfflineBanner mounted at NavigationContainer root

---

## What's Pending

### Google Play Store (need to buy developer account — $25)
- Generate android/ directory: `npx react-native init`
- Run `mobile/scripts/setup-android-release.sh` to create keystore + signing config
- Build release AAB: `cd android && ./gradlew bundleRelease`
- Upload to Google Play Console (play.google.com/console)
- Need: package name (e.g. com.ldplatform.india), store listing screenshots/description

### Production Deployment
- ✅ Nginx reverse proxy config — done (infra/nginx/nginx.conf)
- ✅ CI/CD pipeline — done (.github/workflows/)
- ✅ Docker Compose — done (docker-compose.yml with postgres, redis, api, nginx)
- SSL (Let's Encrypt) — uncomment HTTPS server block in nginx.conf, add certbot
- Production PostgreSQL (Supabase or RDS) + Redis (Upstash or ElastiCache)
- Domain setup + DNS
- GitHub Environments: set STAGING_SSH_HOST, PROD_SSH_HOST, STAGING_SSH_KEY etc.

### Performance
- ✅ DB index audit — done (migration 013_indexes.sql)
- Query optimisation (N+1 checks in analytics routes)
- Load testing setup (k6 or Artillery, target 10k concurrent)
- Read replica for analytics queries

### Desktop App
- ✅ Main process IPC wired (config, exam mode, network, auth token)
- ✅ Preload exposes full electronAPI surface
- ✅ build:renderer script embeds ld-exam-web dist
- ✅ CI verifies desktop renderer build
- Electron auto-updater (electron-updater) for silent OTA updates
- Windows/Mac code signing (requires paid developer certs)

### Real API Keys Needed (to replace placeholders in .env)
- RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET (razorpay.com → Settings → API Keys)
- GOOGLE_APPLICATION_CREDENTIALS (Google Cloud Console → Service Account → TTS API)
- ADMIN_USERNAME / ADMIN_PASSWORD (change from defaults before going live)

### Pilot Launch Checklist
- [ ] Register 2–3 schools in production using /api/schools/register
- [ ] Verify Supabase OTP works with real phone numbers
- [ ] Run all 13 migrations on production DB (`docker compose logs api` to confirm)
- [ ] Set ALLOWED_ORIGINS to production domain
- [ ] Verify Razorpay test keys → switch to live keys
- [ ] Set GitHub Actions secrets: DB_PASSWORD, JWT_SECRET, ADMIN_PASSWORD, SSH keys
- [ ] Send first parent scorecard links to pilot families

---

## Master Plan Gap Analysis (2026-06-10)

Audit of `LD_Platform_Master_Project_Plan.pdf` against the current codebase. ~75% of the plan
is implemented. All planned DB tables exist (users, students, schools, classes,
class_students, screening_sessions, practice_sessions, test_attempts, student_errors,
error_patterns, daily_stats, level_history, exercises, test_questions, ai_recommendations,
notifications, messages, offline_sync_queue). Claude AI integration covers LD classification,
error pattern detection, recommendations, and question variant generation. Google Cloud
TTS/STT are live. 5-level test system with 70% unlock threshold works.

### Remaining gaps (ranked by core importance)

- [x] **AI feedback on wrong answers (FR-05, plan §5.5)** — DONE. `claudeService.js`
      generates `{feedback_text, memory_hook}` (warm, Grade-3-English, "b faces right, d
      faces left" style hooks) on wrong answers. Wired into `practiceEngine.submitAnswer`
      (`/api/practice/answer`, `/api/ld/practice/answer`) and `ld/tests.js` (`/submit` →
      `review[].feedback`). Frontend shows it via `FeedbackCard` in `PracticeSession.jsx`
      and the "Let's review" section in `TestsPage.jsx`. `ANTHROPIC_API_KEY` now set.
- [ ] **Firebase Phone OTP login (FR-01)** — config exists (`env.js`) but no OTP flow wired
      for students/parents; only email+password and demo login work in `web/`.
- [ ] **Teacher 3-day inactivity alert (FR-08)** — no cron/route notifies a teacher when a
      student hasn't logged in for 3+ days.
- [ ] **Weekly recommendations cron (FR-06)** — scheduled but stubbed
      (`console.log("Would generate...")`); doesn't call Claude or write to
      `ai_recommendations` on a weekly cadence.
- [x] **Adaptive practice engine (FR-03)** — DONE. `practiceEngine.js` +
      `exerciseSelector.js` + `spacedRepetition.js` implement level up/down on 3
      consecutive correct / 2 consecutive wrong, spaced-repetition review scheduling
      (SM-2-style), and LD-type-targeted exercise selection. Not a full Elo rating, but
      meets the adaptive-difficulty requirement.
