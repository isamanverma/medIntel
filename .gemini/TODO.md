# MedIntel — Capstone Project TODO Roadmap

> Ordered from quick wins → foundational work → core features → advanced features.
> **Zero-cost constraint**: Uses only free-tier services and local/open-source tools.

---

## Phase 1: Cleanup & Housekeeping ✅ COMPLETE

> Small, quick fixes that remove tech debt and make the codebase capstone-presentable.

### 1.1 Fix Bugs & Dead Code
- [x] **Fix admin dashboard role guard** — ISSUE-001
- [x] **Delete broken shim** — `backend/app/auth.py` (ISSUE-005)
- [x] **Delete empty files** — `routes/`, `deps.py` (ISSUE-006, ISSUE-007)
- [x] **Delete unused schemas** — `schemas.py` (ISSUE-008)
- [x] **Delete stale types** — `next-auth.d.ts` (ISSUE-009)
- [x] **Remove hardcoded demo creds** — ISSUE-021
- [x] **Remove unused deps** — `next-auth`, `@auth/core` from package.json

### 1.2 Config & Security Hardening
- [x] **Create `.env.example`** — backend + frontend (ISSUE-015)
- [x] **JWT secret warning** — Loud warning at startup if using default (ISSUE-002)
- [x] **Make `echo` configurable** — `SQL_ECHO` env var (ISSUE-011)

### 1.3 Consolidate Duplicates
- [x] **Unify frontend types** — Created `lib/types.ts` (ISSUE-013)
- [x] **Remove backward-compat shims** — Deleted `lib/auth.ts`, `lib/api.ts` (ISSUE-023)

### 1.4 Post-Cleanup
- [x] **Error boundary** — `app/error.tsx` (ISSUE-024)
- [x] **404 page** — `app/not-found.tsx` (ISSUE-024)
- [x] **Loading state** — `app/loading.tsx` (ISSUE-024)
- [x] **Migrate middleware → proxy** — Next.js 16 (ISSUE-026)
- [x] **Fix sw.js 404 spam** — `public/sw.js` stub (ISSUE-027)

---

## Phase 2: Backend CRUD APIs (3–5 days)

> Build the endpoints that the dashboards need. Models already exist — you just need routes + services.

### 2.1 Shared Auth Dependency
- [ ] **Create `get_current_user` dependency** — A reusable FastAPI `Depends()` that extracts + validates the JWT and returns the `User`
- [ ] **Create role-checking dependencies** — `require_patient`, `require_doctor`, `require_admin`
- [ ] **Fix signup race condition** — Catch `IntegrityError` for duplicate emails (ISSUE-004)

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

### 2.8 Fix `updated_at` Timestamps
- [ ] **Fix `onupdate` lambda** — Set `updated_at` explicitly in service layer (ISSUE-010)

---

## Phase 3: Connect Frontend to Real Data (3–4 days)

> Replace every hardcoded array with actual API calls.

### 3.1 Profile Setup Flow
- [ ] **Add onboarding step** — After signup, prompt patient/doctor to complete their profile
- [ ] **Profile completion form** — Patient: DOB, blood group, emergency contact. Doctor: specialization, license number

### 3.2 Patient Dashboard — Live Data (ISSUE-018)
- [ ] Replace hardcoded `quickStats` with API calls
- [ ] Replace `recentActivity` with real data
- [ ] Replace health overview with data from vitals API
- [ ] Show real "Health Score" or remove the fake one

### 3.3 Doctor Dashboard — Live Data (ISSUE-017)
- [ ] Replace hardcoded `recentPatients` with `/api/mappings/my-patients` + `/api/appointments/upcoming`
- [ ] Replace stats with real counts
- [ ] Make "Today's Schedule" pull from real appointment data
- [ ] Each doctor sees **only their own** patients

### 3.4 Admin Dashboard — Live Data (ISSUE-019)
- [ ] Build `/api/admin/stats` endpoint
- [ ] Replace hardcoded stats with real database counts
- [ ] Build basic user management list

### 3.5 Fix Landing Page & Footer (ISSUE-020, ISSUE-022)
- [ ] Remove or label fabricated stats
- [ ] Make footer links work or remove them

---

## Phase 4: Testing & Quality (2–3 days)

> Capstone evaluators **will** ask about testing strategy.

### 4.1 Backend Tests (pytest)
- [ ] **Install pytest + httpx** — `uv add --dev pytest pytest-asyncio httpx`
- [ ] **Auth tests** — Signup, login, me, duplicate email, wrong password, expired token
- [ ] **Profile tests** — Create, read, update for patient and doctor
- [ ] **Appointment tests** — Book, list, cancel, status transitions
- [ ] **Authorization tests** — Verify patients can't access doctor endpoints and vice versa

### 4.2 Frontend Quality
- [ ] **Biome lint** — Ensure `npm run lint` passes cleanly
- [ ] **Build check** — Ensure `npm run build` completes without errors

### 4.3 Security Hardening
- [ ] **Rate limiting** — Add `slowapi` for auth endpoints (ISSUE-003)
- [ ] **CSRF protection** — Double-submit cookie or CSRF tokens (ISSUE-016)

### 4.4 Testing (ISSUE-025)
- [ ] Backend test suite with pytest
- [ ] Document testing strategy for capstone presentation

---

## Phase 5: Polish & UX (2–3 days)

> Make it look and feel like a real product.

### 5.1 Navigation & Layout
- [ ] **Add sidebar navigation** to dashboards
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
- [ ] **Option A: Ollama + local LLM** — Llama 3.1 8B, Mistral 7B. Free, runs locally
- [ ] **Option B: Google Gemini API free tier** — 15 RPM free, sufficient for demo
- [ ] **Option C: Hugging Face Inference API** — Free tier for summarization

### 6.2 Report Analysis (AgentInsight)
- [ ] **Auto-summarize uploaded reports** → store in `medical_reports.ai_summary`
- [ ] **Extract key findings** → store in `agent_insights`
- [ ] **Risk/severity classification** — INFO/WARNING/CRITICAL

### 6.3 Patient Insights Dashboard
- [ ] **Show AI-generated insights** on patient dashboard
- [ ] **Doctor view of insights** — Aggregated per patient
- [ ] **Acknowledge/dismiss insights**

### 6.4 Adherence Intelligence
- [ ] **Adherence score calculation**
- [ ] **AI-generated adherence tips**
- [ ] **Streak tracking**

---

## Phase 7: Advanced Features — If Time Permits (5+ days)

> These push it from "good capstone" to "exceptional capstone."

### 7.1 Real-Time Notifications
- [ ] **WebSocket or SSE**
- [ ] **In-app notification bell**

### 7.2 Data Visualization
- [ ] **Charts on dashboards** — Chart.js or Recharts
- [ ] **Adherence trend graph**
- [ ] **Appointment analytics**

### 7.3 Search & Filtering
- [ ] **Patient search for doctors**
- [ ] **Report search**

### 7.4 PDF Report Generation
- [ ] **Generate patient summary PDF**

### 7.5 Audit Log
- [ ] **Track all actions**

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

---

## Estimated Timeline

| Phase | Effort | Cumulative |
|-------|--------|-----------|
| ~~Phase 1: Cleanup~~ | ~~1–2 days~~ | ✅ Done |
| Phase 2: Backend CRUD | 3–5 days | 5–7 days |
| Phase 3: Frontend Connect | 3–4 days | 8–11 days |
| Phase 4: Testing | 2–3 days | 10–14 days |
| Phase 5: Polish | 2–3 days | 12–17 days |
| Phase 6: AI Layer | 3–5 days | 15–22 days |
| Phase 7: Advanced | 5+ days | 20–27+ days |

**Minimum viable capstone** = Phases 1–5 (~17 days)
**Impressive capstone** = Phases 1–6 (~22 days)
**Exceptional capstone** = All phases (~27+ days)
