# LD Platform — Architecture Diagrams

---

## 1. Full System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          USERS / CLIENTS                                    │
│                                                                             │
│   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐      │
│   │   Teacher/Admin  │   │     Parent       │   │     Student      │      │
│   │   Web Browser    │   │   Web Browser    │   │  Android Phone   │      │
│   │  (React + Vite)  │   │ (React + Vite)   │   │ (React Native)   │      │
│   └────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘      │
└────────────│────────────────────── │ ─────────────────────│────────────────┘
             │ HTTP/HTTPS             │                      │ HTTP
             ▼                        ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           YOUR SERVER (Docker)                              │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Nginx (port 80 / 443)                             │  │
│  │                                                                      │  │
│  │   /          →  Serve React build (static files)                    │  │
│  │   /api/*     →  Proxy to Backend container (port 3000)              │  │
│  └──────────────────────────┬───────────────────────────────────────────┘  │
│                             │                                               │
│                             ▼                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │               Node.js / Express Backend (port 3000)                  │  │
│  │                                                                      │  │
│  │  /api/auth          /api/schools        /api/practice               │  │
│  │  /api/students      /api/tests          /api/screening              │  │
│  │  /api/analytics     /api/payments       /api/compliance             │  │
│  │  /api/messages      /api/recommendations /api/tts                  │  │
│  │  /api/admin         /api/reports                                    │  │
│  │                                                                      │  │
│  │  Middleware: helmet · cors · rate-limit · jwt-auth · errorHandler   │  │
│  │  Jobs (cron): re-screening · error-patterns · weekly recommendations│  │
│  └───────────┬─────────────────────────────┬────────────────────────────┘  │
│              │                             │                               │
│              ▼                             ▼                               │
│  ┌───────────────────────┐   ┌─────────────────────────┐                  │
│  │  PostgreSQL 16        │   │  Redis 7                │                  │
│  │  (port 5432 internal) │   │  (port 6379 internal)   │                  │
│  │                       │   │                         │                  │
│  │  All persistent data: │   │  Session cache          │                  │
│  │  users, students,     │   │  JWT blacklist (logout) │                  │
│  │  schools, classes,    │   │  Refresh token refs     │                  │
│  │  tests, practice,     │   │  Rate limit counters    │                  │
│  │  screening, payments, │   │                         │                  │
│  │  messages, consent    │   │  Falls back gracefully  │                  │
│  │  refresh_tokens       │   │  if unavailable         │                  │
│  └───────────────────────┘   └─────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────┘
             │ API calls from backend to external services
             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       EXTERNAL CLOUD SERVICES                               │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Supabase    │  │  Firebase    │  │  Anthropic   │  │  Razorpay    │  │
│  │  (Auth OTP)  │  │  (Auth OTP + │  │  Claude API  │  │  (Payments)  │  │
│  │              │  │   FCM Push)  │  │  Recommendations│  INR/UPI    │  │
│  │  Teacher OTP │  │  Student OTP │  │              │  │             │  │
│  │  Parent OTP  │  │  (mobile)    │  │  claude-     │  │ Subscriptions│  │
│  └──────────────┘  └──────────────┘  │  sonnet-4-6  │  └──────────────┘  │
│                                       └──────────────┘                     │
│  ┌──────────────┐  ┌──────────────┐                                        │
│  │  Google Cloud│  │  Twilio SMS  │                                        │
│  │  TTS API     │  │  (Weekly     │                                        │
│  │  (Voice      │  │   parent     │                                        │
│  │   exercises) │  │   digest)    │                                        │
│  └──────────────┘  └──────────────┘                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Login Flow — All 4 Paths

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WHO IS LOGGING IN?                                       │
└──────────┬───────────────┬───────────────┬──────────────────────────────────┘
           │               │               │               │
           ▼               ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │   TEACHER   │ │   PARENT    │ │    ADMIN    │ │   STUDENT   │
    │  (web app)  │ │  (web app)  │ │  (web app)  │ │ (mobile app)│
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │               │
           ▼               ▼               ▼               ▼
    Phone/Email OTP  Phone/Email OTP  Username +      Firebase Phone
    via Supabase     via Supabase     Password        OTP (SMS)
           │               │               │               │
           ▼               ▼               ▼               ▼
    ┌────────────────────────────┐  ┌─────────────┐  ┌──────────────┐
    │     Supabase Auth          │  │ Check .env  │  │ Firebase     │
    │  (external cloud service)  │  │ ADMIN_USER  │  │ Auth Cloud   │
    │                            │  │ ADMIN_PASS  │  │              │
    │  Sends OTP → user enters   │  └──────┬──────┘  └──────┬───────┘
    │  6-digit code              │         │                 │
    │  Supabase verifies it      │  ✓ Match│                 │ Firebase ID Token
    └────────────┬───────────────┘         │                 │
                 │                         │                 │
      Supabase   │                         │                 │
      Access     │                         │                 │
      Token      │                         │                 │
                 │                         │                 │
                 ▼                         ▼                 ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │              YOUR BACKEND  POST /api/auth/login                 │
    │              (or /api/auth/credentials  or /api/auth/demo)      │
    │                                                                 │
    │  1. Verify token with Supabase/Firebase SDK                     │
    │  2. Look up user in PostgreSQL by phone or email                │
    │     → If new user: INSERT into users table (isNewUser = true)   │
    │     → If parent: resolve child_id from parent_student_links     │
    │  3. Issue our own JWT (access token 24h)                        │
    │  4. Issue refresh token (30 days, stored hashed in DB)          │
    │  5. Return { token, refreshToken, user, isNewUser }             │
    └──────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │              BROWSER / APP receives JWT                         │
    │                                                                 │
    │  localStorage.setItem('auth_token', token)          (web)       │
    │  localStorage.setItem('refresh_token', refreshToken)(web)       │
    │  AsyncStorage.setItem('auth_token', token)          (mobile)    │
    │                                                                 │
    │  If isNewUser == true → show DPDP Consent Modal                 │
    └──────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │                 REDIRECT BY ROLE                                 │
    │                                                                  │
    │  teacher  → /dashboard   (class list, student list)             │
    │  admin    → /admin       (admin dashboard, CMS)                 │
    │  parent   → /parent      (child's scorecard)                    │
    │  student  → /student     (mobile: practice, tests, screening)   │
    │                                                                  │
    │  teacher with no school_id → /onboarding  (wizard first time)   │
    └──────────────────────────────────────────────────────────────────┘
```

---

## 3. JWT Token Lifecycle

```
  LOGIN
    │
    ├── access_token  (JWT, 24 hours)
    │      Stored in localStorage / AsyncStorage
    │      Sent as: Authorization: Bearer <token>
    │      Backend verifies with JWT_SECRET
    │      Also checks Redis: blacklist:<token> (if logged out)
    │
    └── refresh_token  (UUID, 30 days)
           Stored in localStorage / AsyncStorage
           Hash stored in PostgreSQL refresh_tokens table
           Never sent to API routes — only to POST /api/auth/refresh

  EVERY API REQUEST
    │
    ├── axios attaches: Authorization: Bearer <access_token>
    │
    ├── Backend middleware (requireAuth):
    │      jwt.verify(token, JWT_SECRET)        → decode user
    │      Redis get(blacklist:<token>)          → check not logged out
    │      req.user = { userId, role, schoolId }
    │
    ├── 200 OK → response returned normally
    │
    └── 401 Unauthorized
              │
              ├── Has refresh_token in storage?
              │         │
              │         ▼ YES
              │    POST /api/auth/refresh  { refreshToken }
              │         │
              │         ├── Backend looks up hash in DB
              │         ├── Checks: not revoked, not expired
              │         ├── Revokes old refresh token
              │         ├── Issues new access_token + new refresh_token (rotation)
              │         └── Returns { token, refreshToken, user }
              │                   │
              │                   ▼
              │         Store new tokens → retry original request
              │
              └── No refresh_token  →  redirect to /login

  LOGOUT
    │
    ├── POST /api/auth/logout
    ├── Backend: Redis set(blacklist:<token>, true, 24h TTL)
    ├── Backend: PostgreSQL UPDATE refresh_tokens SET revoked=true
    └── Frontend: clear localStorage / AsyncStorage → redirect /login
```

---

## 4. Data Flow — Student Practice Session

```
  Student opens Exercise (mobile)
           │
           ▼
  GET /api/practice/exercises?type=phonics
           │
           ├── Demo student? → return MOCK_EXERCISES (no DB needed)
           └── Real student? → SELECT from exercises WHERE type=phonics
                                ORDER BY difficulty_level (Elo-adapted)
           │
           ▼
  Student completes exercise
           │
           ├── Online?  → POST /api/practice/sessions/:id/attempt  (immediate)
           └── Offline? → Save to SQLite (react-native-sqlite-storage)
                          Queue in offline_sync_queue
                          Sync when back online: POST /api/practice/sessions/sync
           │
           ▼
  Backend records:
    INSERT practice_sessions (score, duration, correct/total)
    INSERT student_errors    (wrong answers, error_type)
    UPDATE students          (streak_count, current_level if test passed)
    UPDATE daily_stats       (minutes_active, score_avg, exercises_done)
           │
           ▼
  Cron jobs (nightly):
    errorPatternJob       → GROUP BY error_type → UPDATE error_patterns
    weeklyRecommendation  → Claude API → INSERT ai_recommendations
    rescreeningJob        → Check last_screened_at > 90 days → send FCM push
```

---

## 5. Container Architecture (Docker)

```
  YOUR SERVER
  ┌─────────────────────────────────────────────────────────┐
  │                                                         │
  │  ┌──────────────────────────────────────────────────┐  │
  │  │  ld_web  (Nginx + React build)  port 80          │  │
  │  │                                                  │  │
  │  │  Serves:  /         → React SPA                 │  │
  │  │  Proxies: /api/*    → http://backend:3000        │  │
  │  └─────────────────────────┬────────────────────────┘  │
  │                            │ Docker internal network    │
  │                            ▼                           │
  │  ┌──────────────────────────────────────────────────┐  │
  │  │  ld_backend  (Node.js)  internal only            │  │
  │  │                                                  │  │
  │  │  Startup sequence:                               │  │
  │  │    1. runMigrations()  ← runs all SQL files      │  │
  │  │    2. connectRedis()   ← non-blocking            │  │
  │  │    3. initFirebase()   ← non-blocking            │  │
  │  │    4. app.listen(3000) ← server starts           │  │
  │  │    5. startCronJobs()  ← background jobs         │  │
  │  └──────────────┬───────────────┬───────────────────┘  │
  │                 │               │ Docker internal        │
  │                 ▼               ▼                       │
  │  ┌──────────────────┐  ┌──────────────────┐           │
  │  │  ld_postgres     │  │  ld_redis        │           │
  │  │  PostgreSQL 16   │  │  Redis 7         │           │
  │  │  Volume:         │  │  Volume:         │           │
  │  │  postgres_data   │  │  redis_data      │           │
  │  │  (persists on    │  │  (persists on    │           │
  │  │   disk forever)  │  │   disk forever)  │           │
  │  └──────────────────┘  └──────────────────┘           │
  │                                                         │
  │  All 4 containers on same Docker bridge network.        │
  │  Only Nginx (port 80) is reachable from outside.        │
  └─────────────────────────────────────────────────────────┘

  Startup order (enforced by depends_on + healthcheck):
    postgres (healthy) ──┐
                         ├──► backend (starts) ──► web (starts)
    redis    (healthy) ──┘

  Migrations run automatically on every backend start.
  Already-applied migrations are skipped (tracked in schema_migrations table).
```
