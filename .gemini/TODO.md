# MedIntel — Capstone Project TODO Roadmap

> Ordered from quick wins → foundational work → core features → advanced features.
> **Zero-cost constraint**: Uses only free-tier services and local/open-source tools.

---

## Phase 1: Cleanup & Housekeeping (1–2 days)

> Small, quick fixes that remove tech debt and make the codebase capstone-presentable.

### 1.1 Fix Bugs & Dead Code
- [ ] **Fix admin dashboard role guard** — Add `session.user.role !== "ADMIN"` check in `app/admin/dashboard/page.tsx` (copy pattern from patient/doctor dashboards)
- [ ] **Delete broken shim** — Remove `backend/app/auth.py` (imports non-existent `app.api.v1.auth`)
- [ ] **Delete empty files** — Remove `backend/app/deps.py`, `backend/app/routes/doctors.py`, `backend/app/routes/patients.py`, `backend/app/routes/reports.py`, `backend/app/routes/` directory
- [ ] **Delete unused schemas** — Remove `backend/app/schemas.py` (nothing imports it)
- [ ] **Delete stale types** — Remove `frontend/types/next-auth.d.ts` (NextAuth was removed)
- [ ] **Remove hardcoded demo creds** — Remove the admin credentials hint from the login page

### 1.2 Config & Security Hardening
- [ ] **Create `.env.example`** — Template with all env vars (no secrets), add to git
- [ ] **Make JWT secret required** — Raise `ValueError` in `config.py` if `JWT_SECRET_KEY` is not explicitly set
- [ ] **Make `echo` configurable** — `echo=os.getenv("SQL_ECHO", "false").lower() == "true"` in `db/engine.py`
- [ ] **Add `DATABASE_URL` to `.env.example`** — With placeholder format

### 1.3 Consolidate Duplicates
- [ ] **Unify backend schemas** — Move `LoginRequest` from `api/auth.py` into `models/user.py`, remove the inline definition
- [ ] **Unify frontend types** — Define `UserRole`, `SessionUser` once in `lib/types.ts`, import everywhere
- [ ] **Remove backward-compat shims** — Inline `lib/api.ts` and `lib/auth.ts` exports into their real modules, delete the shim files

---

## Phase 2: Backend CRUD APIs (3–5 days)

> Build the endpoints that the dashboards need. Models already exist — you just need routes + services.

### 2.1 Shared Auth Dependency
- [ ] **Create `get_current_user` dependency** — A reusable FastAPI `Depends()` that extracts + validates the JWT and returns the `User` (move from `_extract_bearer_token` in `api/auth.py` to a shared `deps.py`)
- [ ] **Create role-checking dependencies** — `require_patient`, `require_doctor`, `require_admin` decorators/dependencies

### 2.2 Profile APIs
- [ ] **POST `/api/profiles/patient`** — Create patient profile (linked to user)
- [ ] **GET `/api/profiles/patient/me`** — Get current patient's profile
- [ ] **PUT `/api/profiles/patient/me`** — Update patient profile
- [ ] **POST `/api/profiles/doctor`** — Create doctor profile
- [ ] **GET `/api/profiles/doctor/me`** — Get current doctor's profile
- [ ] **PUT `/api/profiles/doctor/me`** — Update doctor profile

### 2.3 Patient-Doctor Mapping
- [ ] **POST `/api/mappings`** — Doctor assigns themselves to a patient (or vice versa)
- [ ] **GET `/api/mappings/my-patients`** — Doctor gets their patient list
- [ ] **GET `/api/mappings/my-doctors`** — Patient gets their doctor list
- [ ] **DELETE `/api/mappings/{id}`** — Remove a mapping

### 2.4 Appointments
- [ ] **POST `/api/appointments`** — Book an appointment
- [ ] **GET `/api/appointments/upcoming`** — Get upcoming appointments for current user
- [ ] **GET `/api/appointments/history`** — Past appointments
- [ ] **PUT `/api/appointments/{id}`** — Update status (confirm, cancel, complete)
- [ ] **GET `/api/appointments/{id}`** — Single appointment detail

### 2.5 Treatment Plans & Medications
- [ ] **POST `/api/treatment-plans`** — Doctor creates a treatment plan for a patient
- [ ] **GET `/api/treatment-plans/patient/{id}`** — Get all plans for a patient
- [ ] **POST `/api/treatment-plans/{id}/medications`** — Add medication to a plan
- [ ] **PUT `/api/treatment-plans/{id}`** — Update plan status

### 2.6 Medical Reports
- [ ] **POST `/api/reports`** — Upload a medical report (use Supabase Storage free tier or local file system)
- [ ] **GET `/api/reports/patient/{id}`** — List reports for a patient
- [ ] **GET `/api/reports/{id}`** — Get single report detail

### 2.7 Adherence Tracking
- [ ] **POST `/api/adherence`** — Log a medication as taken/missed/late
- [ ] **GET `/api/adherence/patient/{id}`** — Get adherence history
- [ ] **GET `/api/adherence/stats/{patient_id}`** — Compute adherence percentage

---

## Phase 3: Connect Frontend to Real Data (3–4 days)

> Replace every hardcoded array with actual API calls.

### 3.1 Profile Setup Flow
- [ ] **Add onboarding step** — After signup, prompt patient/doctor to complete their profile
- [ ] **Profile completion form** — Patient: DOB, blood group, emergency contact. Doctor: specialization, license number

### 3.2 Patient Dashboard — Live Data
- [ ] Replace hardcoded `quickStats` with API calls (`/api/appointments/upcoming`, `/api/reports/patient/me`, etc.)
- [ ] Replace `recentActivity` with real data from appointments, reports, adherence
- [ ] Replace health overview (BP, heart rate, BMI) with data from latest report or vitals API
- [ ] Show real "Health Score" or remove the fake one

### 3.3 Doctor Dashboard — Live Data
- [ ] Replace hardcoded `recentPatients` with `/api/mappings/my-patients` + `/api/appointments/upcoming`
- [ ] Replace stats (Total Patients, Appointments Today) with real counts
- [ ] Make "Today's Schedule" pull from real appointment data
- [ ] Each doctor sees **only their own** patients and appointments

### 3.4 Admin Dashboard — Live Data
- [ ] Build `/api/admin/stats` endpoint (total users, recent signups)
- [ ] Replace hardcoded stats with real database counts
- [ ] Build basic user management list (GET `/api/admin/users`)

### 3.5 Fix Landing Page
- [ ] Remove or label fabricated stats (`50k+` records, `99.9%` uptime) — either show real stats or display "In Development"
- [ ] Make footer links either work or remove them (Documentation, Privacy Policy, etc.)

---

## Phase 4: Testing & Quality (2–3 days)

> Capstone evaluators **will** ask about testing strategy.

### 4.1 Backend Tests (pytest)
- [ ] **Install pytest + httpx** — `uv add --dev pytest pytest-asyncio httpx`
- [ ] **Auth tests** — Signup, login, me, duplicate email, wrong password, expired token
- [ ] **Profile tests** — Create, read, update for patient and doctor
- [ ] **Appointment tests** — Book, list, cancel, status transitions
- [ ] **Authorization tests** — Verify patients can't access doctor endpoints and vice versa

### 4.2 Frontend Tests (optional but impressive)
- [ ] **Biome lint** — Ensure `npm run lint` passes cleanly
- [ ] **Build check** — Ensure `npm run build` completes without errors

### 4.3 Error Handling
- [ ] **Add global error boundary** in Next.js (`app/error.tsx`)
- [ ] **Add 404 page** (`app/not-found.tsx`)
- [ ] **Add loading states** (`app/loading.tsx` for each route group)

---

## Phase 5: Polish & UX (2–3 days)

> Make it look and feel like a real product.

### 5.1 Navigation & Layout
- [ ] **Add sidebar navigation** to dashboards (patient: Appointments, Reports, Profile, Settings. Doctor: Patients, Schedule, Reports, Settings)
- [ ] **Add breadcrumbs** on inner pages
- [ ] **Mobile responsive** — Test all pages on 375px viewport

### 5.2 Forms & Interactions
- [ ] **Appointment booking form** — Date picker, doctor selection, reason
- [ ] **Report upload form** — File picker, report type dropdown
- [ ] **Profile edit form** — Inline editing or modal
- [ ] **Toast notifications** — Success/error feedback on form submissions

### 5.3 Data Display
- [ ] **Tables with sorting/filtering** for appointments, reports, patients
- [ ] **Empty states** — Friendly illustrations when no data exists
- [ ] **Pagination** on list endpoints

---

## Phase 6: AI/Intelligence Layer — Free Tier Only (3–5 days)

> The "wow factor" that makes this a healthcare **intelligence** platform. All free.

### 6.1 Local AI Options (Zero Cost)
- [ ] **Option A: Ollama + local LLM** — Run a small model locally (Llama 3.1 8B, Mistral 7B) for text analysis. Free, runs on your machine
- [ ] **Option B: Google Gemini API free tier** — 15 RPM free, sufficient for demo
- [ ] **Option C: Hugging Face Inference API** — Free tier for summarization models

### 6.2 Report Analysis (AgentInsight)
- [ ] **Auto-summarize uploaded reports** — When a report is uploaded, send the text to the AI model for summarization → store in `medical_reports.ai_summary`
- [ ] **Extract key findings** — Parse medications, conditions, recommendations from report text → store in `agent_insights`
- [ ] **Risk/severity classification** — Classify insights as INFO/WARNING/CRITICAL using the AI

### 6.3 Patient Insights Dashboard
- [ ] **Show AI-generated insights** on patient dashboard — "Based on your recent lab report, your cholesterol is borderline high"
- [ ] **Doctor view of insights** — Show aggregated insights for each patient on the doctor dashboard
- [ ] **Acknowledge/dismiss insights** — Toggle `is_acknowledged` on `AgentInsight`

### 6.4 Adherence Intelligence
- [ ] **Adherence score calculation** — Percentage of taken vs missed medications
- [ ] **AI-generated adherence tips** — "You've been missing your evening dose. Consider setting a 7 PM alarm."
- [ ] **Streak tracking** — "5-day adherence streak! Keep it up."

---

## Phase 7: Advanced Features — If Time Permits (5+ days)

> These push it from "good capstone" to "exceptional capstone." Only attempt after Phases 1–6.

### 7.1 Real-Time Notifications
- [ ] **WebSocket or SSE** — Notify doctors when appointment is booked, patients when results are ready
- [ ] **In-app notification bell** — Unread count badge, notification drawer

### 7.2 Data Visualization
- [ ] **Charts on dashboards** — Use free Chart.js or Recharts
- [ ] **Adherence trend graph** — Weekly/monthly adherence over time
- [ ] **Appointment analytics** — Completed vs cancelled ratio for doctors

### 7.3 Search & Filtering
- [ ] **Patient search for doctors** — Search by name, condition, date range
- [ ] **Report search** — Full-text search on report content

### 7.4 PDF Report Generation
- [ ] **Generate patient summary PDF** — Treatment plan + medications + adherence + AI insights as a downloadable report

### 7.5 Audit Log
- [ ] **Track all actions** — Who did what, when (important for healthcare compliance)

---

## Free-Tier Service Map

| Need | Free Option | Limit |
|------|------------|-------|
| Database | Supabase Free (already using) | 500 MB, 2 projects |
| File Storage | Supabase Storage Free / local disk | 1 GB |
| AI/LLM | Ollama (local) | Unlimited, needs 8GB+ RAM |
| AI/LLM Alt | Google Gemini API Free | 15 RPM |
| AI/LLM Alt | Hugging Face Inference | Rate limited |
| Hosting | Vercel Free (frontend) | 100 GB bandwidth |
| Hosting | Render Free (backend) | Spins down after 15 min |
| Email | None needed for MVP | — |

---

## Estimated Timeline

| Phase | Effort | Cumulative |
|-------|--------|-----------|
| Phase 1: Cleanup | 1–2 days | 2 days |
| Phase 2: Backend CRUD | 3–5 days | 7 days |
| Phase 3: Frontend Connect | 3–4 days | 11 days |
| Phase 4: Testing | 2–3 days | 14 days |
| Phase 5: Polish | 2–3 days | 17 days |
| Phase 6: AI Layer | 3–5 days | 22 days |
| Phase 7: Advanced | 5+ days | 27+ days |

**Minimum viable capstone** = Phases 1–5 (~17 days)
**Impressive capstone** = Phases 1–6 (~22 days)
**Exceptional capstone** = All phases (~27+ days)
