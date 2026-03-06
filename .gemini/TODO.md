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

## Phase 2: Backend CRUD APIs ✅ COMPLETE

> All 27 endpoints implemented + 35 passing tests. TDD approach used throughout.

### 2.1 Shared Auth Dependency
- [x] **Create `get_current_user` dependency** — `app/deps.py` with JWT extraction from header/cookie
- [x] **Create role-checking dependencies** — `require_patient`, `require_doctor`, `require_admin`
- [x] **Fix signup race condition** — Catch `IntegrityError` for duplicate emails (ISSUE-004)

### 2.2 Profile APIs
- [x] **POST `/api/profiles/patient`** — Create patient profile (linked to user)
- [x] **GET `/api/profiles/patient/me`** — Get current patient's profile
- [x] **PUT `/api/profiles/patient/me`** — Update patient profile
- [x] **POST `/api/profiles/doctor`** — Create doctor profile
- [x] **GET `/api/profiles/doctor/me`** — Get current doctor's profile
- [x] **PUT `/api/profiles/doctor/me`** — Update doctor profile

### 2.3 Patient-Doctor Mapping
- [x] **POST `/api/mappings`** — Create patient-doctor mapping
- [x] **GET `/api/mappings/my-patients`** — Doctor gets their patient list
- [x] **GET `/api/mappings/my-doctors`** — Patient gets their doctor list
- [x] **DELETE `/api/mappings/{id}`** — Deactivate a mapping

### 2.4 Appointments
- [x] **POST `/api/appointments`** — Book an appointment
- [x] **GET `/api/appointments/upcoming`** — Get upcoming appointments
- [x] **GET `/api/appointments/history`** — Past/completed appointments
- [x] **PUT `/api/appointments/{id}`** — Update status (confirm, cancel, complete)
- [x] **GET `/api/appointments/{id}`** — Single appointment detail

### 2.5 Treatment Plans & Medications
- [x] **POST `/api/treatment-plans`** — Doctor creates a treatment plan
- [x] **GET `/api/treatment-plans/patient/{id}`** — Get all plans for a patient
- [x] **POST `/api/treatment-plans/{id}/medications`** — Add medication to a plan
- [x] **PUT `/api/treatment-plans/{id}`** — Update plan status

### 2.6 Medical Reports
- [x] **POST `/api/reports`** — Upload medical report metadata
- [x] **GET `/api/reports/patient/{id}`** — List reports for a patient
- [x] **GET `/api/reports/{id}`** — Get single report detail

### 2.7 Adherence Tracking
- [x] **POST `/api/adherence`** — Log medication as taken/missed/late
- [x] **GET `/api/adherence/patient/{id}`** — Get adherence history
- [x] **GET `/api/adherence/stats/{patient_id}`** — Compute adherence percentage

---

## Phase 3: Connect Frontend to Real Data ✅ COMPLETE

> Replace every hardcoded array with actual API calls.

### 3.1 Profile Setup Flow ✅
- [x] **Profile onboarding forms** — Patient: DOB, blood group, emergency contact. Doctor: specialization, license number
- [x] **Profile incomplete banner** — Prompts user to complete profile on dashboard

### 3.2 Patient Dashboard — Live Data (ISSUE-018) ✅
- [x] Replace hardcoded `quickStats` with API calls
- [x] Replace `recentActivity` with real appointment data
- [x] Replace health overview with profile data or empty state
- [x] Remove fake "Health Score 87"

### 3.3 Doctor Dashboard — Live Data (ISSUE-017) ✅
- [x] Replace hardcoded `recentPatients` with `/api/mappings/my-patients` + `/api/appointments/upcoming`
- [x] Replace stats with real counts
- [x] Make schedule pull from real appointment data
- [x] Each doctor sees **only their own** patients

### 3.4 Admin Dashboard — Live Data (ISSUE-019) ✅
- [x] Build `/api/admin/stats` endpoint (7 real counts)
- [x] Replace hardcoded stats with real database counts

### 3.5 Fix Landing Page & Footer (ISSUE-020, ISSUE-022) ✅
- [x] Replace fabricated stats with honest labels
- [x] Remove dead footer links

---

## Phase 4: Security & Interactive Features ✅ COMPLETE

> Rate limiting, interactive forms, reusable UI components.

### 4.1 Security Hardening ✅
- [x] **Rate limiting** — `slowapi` on auth endpoints: signup 3/min, login 5/min (ISSUE-003)
- [x] **TESTING/RATE_LIMIT_ENABLED** — Config flags to disable rate limiting in tests

### 4.2 Reusable UI Components ✅
- [x] **Modal component** — `components/ui/Modal.tsx` with escape, backdrop click, scroll lock
- [x] **Toast notifications** — `components/ui/Toast.tsx` with success/error/info types
- [x] **ToastProvider** — Wrapped root layout

### 4.3 Interactive Dashboards ✅
- [x] **Patient dashboard** — Profile onboarding form (5 fields) + appointment booking (doctor select, datetime, notes)
- [x] **Doctor dashboard** — Profile form (4 fields) + add patient + confirm/cancel/complete appointments
- [x] **Admin dashboard** — Real user management table (name, email, role, status, joined date)

### 4.4 API Client Mutations ✅
- [x] **13+ mutation functions** — createPatientProfile, createDoctorProfile, createAppointment, updateAppointmentStatus, createMapping, deleteMapping, createTreatmentPlan, getPatientTreatmentPlans, getAdminUsers
- [x] **GET `/api/admin/users`** — Admin user list endpoint

---

## Phase 5: Patient Data, Referrals & Multi-Doctor Collaboration ✅ COMPLETE

> Clinically comprehensive patient data fields, admin-driven assignments, and multi-doctor care.

### 5.1 Comprehensive Patient Profile Fields
- [x] **Medical history** — Allergies (text array), chronic conditions (text array), past surgeries
- [ ] **Current medications** — Name, dosage, frequency (separate from treatment plan meds)
- [x] **Vitals tracking** — Height (cm), weight (kg), BMI (auto-calculated), blood pressure
- [x] **Insurance info** — Provider name, policy number, group number
- [x] **Address** — Street, city, state, zip code, country
- [x] **Demographics** — Gender (select), phone number, preferred language
- [x] **Backend**: Extend `PatientProfile` model + Alembic migration
- [x] **Frontend**: Multi-section patient profile form (Personal → Medical → Insurance → Contact)

### 5.2 Admin Patient-Doctor Assignment
- [x] **Backend**: `POST /api/admin/assignments` — Admin assigns a patient to a doctor (creates mapping)
- [x] **Backend**: `GET /api/admin/assignments` — List all patient-doctor assignments
- [x] **Backend**: `DELETE /api/admin/assignments/{id}` — Admin removes an assignment
- [x] **Frontend**: Admin dashboard — patient-doctor assignment form (search patient + select doctor)
- [x] **Frontend**: Assignment list table with bulk actions

### 5.3 Doctor Referral System
- [x] **Backend model**: `Referral` table — `referring_doctor_id`, `referred_doctor_id`, `patient_id`, `reason`, `status` (PENDING/ACCEPTED/DECLINED), `notes`
- [x] **Backend**: `POST /api/referrals` — Doctor creates a referral to another doctor
- [x] **Backend**: `GET /api/referrals/sent` — Doctor's outgoing referrals
- [x] **Backend**: `GET /api/referrals/received` — Doctor's incoming referrals
- [x] **Backend**: `PATCH /api/referrals/{id}` — Accept/decline a referral
- [x] **Frontend**: Doctor dashboard — "Refer Patient" form (select patient, select doctor, reason)
- [x] **Frontend**: Referral inbox/outbox views with accept/decline actions

### 5.4 Multi-Doctor Collaboration (Care Team)
- [x] **Backend model**: `CareTeam` table — `patient_id`, `name` (e.g. "Cardiac Care Team")
- [x] **Backend model**: `CareTeamMember` — `care_team_id`, `doctor_id`, `role` (PRIMARY/CONSULTANT/SPECIALIST)
- [x] **Backend**: `POST /api/care-teams` — Create a care team for a patient
- [x] **Backend**: `POST /api/care-teams/{id}/members` — Add a doctor to the care team
- [x] **Backend**: `GET /api/care-teams/patient/{id}` — Get all care teams for a patient
- [x] **Backend**: `GET /api/care-teams/doctor/me` — Get care teams a doctor belongs to
- [x] **Frontend**: Patient card showing care team members
- [x] **Frontend**: Doctor dashboard — care team management view

### 5.5 CSRF Protection (ISSUE-016) ✅
- [x] **CSRF middleware** — Double-submit cookie pattern on backend
- [x] **Backend config** — CSRF_ENABLED, CSRF_SECRET settings
- [x] **Enhanced config.py** — Feature flags, pagination, security, CORS settings (14 TDD tests)

---

## Phase 5b: Profile Sections, Login Fix, Chat, Admin Controls (3–5 days) ✅ COMPLETE

> Profile visibility, role security, secure messaging, and admin power-ups.

### 5b.1 Role-Validated Login (ISSUE-028) 🔴 ✅
- [x] **Backend**: Add `role` param to `LoginRequest` + `verify_credentials()`
- [x] **Backend**: Reject login if user.role ≠ expected role → "No such {role} account found"
- [x] **Frontend BFF**: Forward `role` to FastAPI login endpoint
- [x] **Frontend Login**: Include selected role in POST body
- [x] **Tests**: Doctor can't login as admin, patient can't login as doctor

### 5b.2 Profile Sections with Visible IDs (ISSUE-029) ✅
- [x] **Patient Dashboard**: Profile card showing User ID + Patient Profile ID (copy button)
- [x] **Doctor Dashboard**: Profile card showing User ID + Doctor Profile ID (copy button)
- [x] **Admin Dashboard**: Profile card with User ID + account details
- [x] Show email, role, creation date on all profile cards

### 5b.3 Secure Chat System (ISSUE-030) ✅
- [x] **Backend model**: `ChatRoom` — `id`, `room_type` (DIRECT/GROUP), `created_by`, `created_at`
- [x] **Backend model**: `ChatParticipant` — `room_id`, `user_id`, `joined_at`
- [x] **Backend model**: `ChatMessage` — `room_id`, `sender_id`, `content`, `created_at`, `is_deleted`
- [x] **Backend**: `POST /api/chat/rooms` — Create chat room
- [x] **Backend**: `GET /api/chat/rooms` — List my rooms
- [x] **Backend**: `POST /api/chat/rooms/{id}/messages` — Send message
- [x] **Backend**: `GET /api/chat/rooms/{id}/messages` — Get history
- [x] **Backend**: `DELETE /api/chat/rooms/{id}/messages/{msg_id}` — Admin-only soft delete
- [x] **Frontend**: Chat section on patient + doctor dashboards
- [x] **Frontend**: Message history, send input, no user edit/delete
- [x] **Tests**: Create room, send message, history order, admin delete, user can't delete

### 5b.4 Admin Controls (ISSUE-031) ✅
- [x] **Backend**: `PATCH /api/admin/users/{id}/role` — Change user role
- [x] **Backend**: `PATCH /api/admin/users/{id}/status` — Activate/deactivate
- [x] **Backend**: `DELETE /api/admin/users/{id}` — Hard delete
- [x] **Frontend**: Action buttons per user row (role dropdown, toggle, delete)
- [x] **Tests**: Admin can change role, toggle status, delete user; non-admin cannot

---

## Phase 5c: UX Workflows & Doctor-Patient Discovery (3–5 days)

> Fix broken workflows and remove UUID dependency with proper discovery pages.

### 5c.1 Fix Patient DOB in Doctor Panel (ISSUE-032) 🟡
- [ ] **Backend**: Include `date_of_birth` in `PatientListItem` response schema
- [ ] **Frontend**: Update doctor patient card to display real DOB or gracefully handle missing data

### 5c.2 Fix Patient Appointment Booking (ISSUE-033) 🔴
- [ ] **Debug**: Identify schema mismatch causing 422 on `POST /api/appointments`
- [ ] **Frontend**: Fix appointment form to send correct payload (likely `doctor_id` format issue)
- [ ] **Tests**: Add test for patient booking an appointment successfully

### 5c.3 Chat Entry Points from Patient List (ISSUE-034) 🟠
- [ ] **Frontend**: Add "Chat" icon button per patient in doctor's patient list
- [ ] **Backend/Frontend**: Auto-create or reuse an existing DIRECT chat room when clicked
- [ ] **Frontend**: Same for patient's doctor list — "Chat with Doctor" button

### 5c.4 Doctor-Patient Discovery System (ISSUE-035) 🔴
- [ ] **Backend**: `GET /api/doctors/available` — Public listing of doctors (name, specialization, availability)
- [ ] **Backend**: `POST /api/assistance-requests` — Patient submits a request (doctor_id optional, problem description required)
- [ ] **Backend**: `GET /api/assistance-requests/incoming` — Doctor sees pending requests
- [ ] **Backend**: `PATCH /api/assistance-requests/{id}` — Doctor accepts/declines a request (auto-creates mapping on accept)
- [ ] **Frontend**: Patient "Find a Doctor" page — browse by specialization, submit request
- [ ] **Frontend**: Doctor "Patient Requests" page — view incoming requests with problem descriptions, accept/decline
- [ ] **Frontend**: Replace all manual UUID inputs with searchable dropdowns where applicable

### 5c.5 Doctor Patient Data View (ISSUE-036) 🟠
- [ ] **Frontend**: Patient detail page/modal accessible from doctor's patient list
- [ ] **Frontend**: Display full patient profile (medical history, allergies, vitals, insurance, address)
- [ ] **Frontend**: Show patient's treatment plans, medications, adherence stats, reports
- [ ] **Frontend**: Show patient's care team memberships

---

## Phase 6: AI/Intelligence Layer — Google Gemini Free Tier (3–5 days)

> The "wow factor" that makes this a healthcare **intelligence** platform.

### 6.1 AI Integration Setup
- [ ] **Google Gemini API free tier** — 15 RPM free, sufficient for demo [USE THIS ONE]
- [ ] **Backend**: `services/ai_service.py` — Gemini API wrapper with retry + rate limiting
- [ ] **Config**: `GEMINI_API_KEY` env var

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
| AI/LLM | Google Gemini API Free | 15 RPM |
| Hosting | Vercel Free (frontend) | 100 GB bandwidth |
| Hosting | Render Free (backend) | Spins down after 15 min |

---

## Estimated Timeline

| Phase | Effort | Cumulative |
|-------|--------|-----------|
| ~~Phase 1: Cleanup~~ | ~~1–2 days~~ | ✅ Done |
| ~~Phase 2: Backend CRUD~~ | ~~3–5 days~~ | ✅ Done |
| ~~Phase 3: Frontend Connect~~ | ~~3–4 days~~ | ✅ Done |
| ~~Phase 4: Security + Interactive~~ | ~~2–3 days~~ | ✅ Done |
| ~~Phase 5: Patient Data + Referrals~~ | ~~3–5 days~~ | ✅ Done |
| ~~Phase 5b: Fixes & Chat~~ | ~~3–5 days~~ | ✅ Done |
| Phase 5c: UX & Discovery | 3–5 days | 24–34 days |
| Phase 6: AI Layer | 3–5 days | 27–39 days |
| Phase 7: Advanced | 5+ days | 32–44+ days |

**Minimum viable capstone** = Phases 1–5 (~19 days)
**Impressive capstone** = Phases 1–6 (~24 days)
**Exceptional capstone** = All phases (~29+ days)
