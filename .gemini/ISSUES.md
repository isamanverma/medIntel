# MedIntel — Known Issues & Technical Debt

> Comprehensive inventory of every issue found during code review.
> Each issue links to the TODO phase where it will be resolved.
>
> Last updated: 2026-03-06 (after Phase 4-5 completion)

---

## 🔴 Critical — Security & Correctness

### ~~ISSUE-001: Admin Dashboard Missing Role Guard~~ ✅ RESOLVED
- **Fixed in**: Phase 1.1 — Added role guard with `useEffect` redirect + render null check.

### ~~ISSUE-002: Hardcoded JWT Secret Default~~ ✅ RESOLVED
- **Fixed in**: Phase 1.2 — Startup now logs a loud warning if the default JWT secret is used.

### ~~ISSUE-003: No Rate Limiting on Auth Endpoints~~ ✅ RESOLVED
- **Fixed in**: Phase 4 — Added `slowapi` rate limiter: signup 3/min, login 5/min per IP. Returns `429 Too Many Requests`. Disabled in test mode via `TESTING` env var.

### ~~ISSUE-004: Signup Race Condition (Duplicate Email)~~ ✅ RESOLVED
- **Fixed in**: Phase 2.1 — Added `IntegrityError` catch in `create_user()`.

---

## 🟠 High — Broken Code & Dead Files

### ~~ISSUE-005: Broken Import Shim~~ ✅ RESOLVED
- **Fixed in**: Phase 1.1 — Deleted `backend/app/auth.py`.

### ~~ISSUE-006: Empty Route Files~~ ✅ RESOLVED
- **Fixed in**: Phase 1.1 — Deleted entire `backend/app/routes/` directory.

### ~~ISSUE-007: Empty `deps.py`~~ ✅ RESOLVED
- **Fixed in**: Phase 1.1 — Deleted `backend/app/deps.py`. Recreated with real content in Phase 2.

### ~~ISSUE-008: Unused `schemas.py`~~ ✅ RESOLVED
- **Fixed in**: Phase 1.1 — Deleted `backend/app/schemas.py`.

### ~~ISSUE-009: Stale `next-auth.d.ts`~~ ✅ RESOLVED
- **Fixed in**: Phase 1.1 — Deleted `frontend/types/next-auth.d.ts`. Also removed `next-auth` and `@auth/core` from `package.json`.

---

## 🟡 Medium — Best Practice Violations

### ~~ISSUE-010: `onupdate` Lambda Won't Fire with ORM Pattern~~ ✅ RESOLVED
- **Fixed in**: Phase 3 — Removed broken `onupdate` lambda from 4 models. Added SQLAlchemy `before_flush` event listener in `engine.py`.

### ~~ISSUE-011: SQL `echo=True` Left On~~ ✅ RESOLVED
- **Fixed in**: Phase 1.2 — Now reads `SQL_ECHO` env var, defaults to `false`.

### ~~ISSUE-012: Mixed Folder Conventions~~ ✅ RESOLVED
- **Fixed in**: Phase 1.1 — Deleted `routes/` directory, standardized on `api/`.

### ~~ISSUE-013: Frontend Type Duplication~~ ✅ RESOLVED
- **Fixed in**: Phase 1.3 — Created shared `lib/types.ts`, updated all imports.

### ~~ISSUE-014: Duplicate Schema Definitions in Backend~~ ✅ RESOLVED
- **Fixed in**: Phase 1.3 — Deleted `schemas.py`, kept inline schemas in source files.

### ~~ISSUE-015: No `.env.example` File~~ ✅ RESOLVED
- **Fixed in**: Phase 1.2 — Created `.env.example` for both backend and frontend.

### ~~ISSUE-016: No CSRF Protection Beyond SameSite~~ ✅ RESOLVED
- **Fixed in**: Phase 5 — Implemented double-submit cookie CSRF middleware (`app/middleware/csrf.py`). Disabled by default (`CSRF_ENABLED=false`), configurable per environment.
- **TODO Phase**: Phase 5 (security polish)

---

## 🔵 Low — Hardcoded Data & Cosmetic Issues

### ~~ISSUE-017: All Doctors See Identical Appointments~~ ✅ RESOLVED
- **Fixed in**: Phase 3 — Doctor dashboard rewritten to fetch real data.

### ~~ISSUE-018: All Patients See Identical Health Data~~ ✅ RESOLVED
- **Fixed in**: Phase 3 — Patient dashboard rewritten with live API calls.

### ~~ISSUE-019: Admin Dashboard Fake System Stats~~ ✅ RESOLVED
- **Fixed in**: Phase 3 — Built `GET /api/admin/stats` endpoint (7 real DB counts).

### ~~ISSUE-020: Landing Page Fabricated Stats~~ ✅ RESOLVED
- **Fixed in**: Phase 3 — Replaced fabricated stats with honest labels.

### ~~ISSUE-021: Demo Credentials Exposed~~ ✅ RESOLVED
- **Fixed in**: Phase 1.1 — Removed `admin@medintel.com / admin123` from login page.

### ~~ISSUE-022: Footer Dead Links~~ ✅ RESOLVED
- **Fixed in**: Phase 3 — Removed all dead `<span>` tags. Kept only working links.

### ~~ISSUE-023: Backward-Compat Shim Files~~ ✅ RESOLVED
- **Fixed in**: Phase 1.3 — Deleted `lib/auth.ts` and `lib/api.ts`.

### ~~ISSUE-024: No Error Boundary or 404 Page~~ ✅ RESOLVED
- **Fixed in**: Phase 1 — Added `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx`.

### ~~ISSUE-025: No Tests at All~~ ✅ RESOLVED
- **Fixed in**: Phase 2 — Added 35 tests across 4 test files.

### ISSUE-026: Next.js Middleware Deprecation ✅ RESOLVED
- **Fixed in**: Post Phase 1 — Renamed `middleware.ts` → `proxy.ts`.

### ISSUE-027: sw.js 404 Spam ✅ RESOLVED
- **Fixed in**: Post Phase 1 — Added `public/sw.js` no-op stub.

---

## New Issues (Phase 5b)

### ~~ISSUE-028: Cross-Role Login — Doctor Can Login as Admin~~ ✅ RESOLVED
- **Fixed in**: Phase 5b — Passed `expected_role` from frontend login form and validated role match before issuing JWT.

### ~~ISSUE-029: Profile IDs Not Visible to Users~~ ✅ RESOLVED
- **Fixed in**: Phase 5b — Added profile sections to all three dashboards displaying User ID and Profile ID with copy-to-clipboard functionality.

### ~~ISSUE-030: No Secure Chat Feature~~ ✅ RESOLVED
- **Fixed in**: Phase 5b — Implemented ChatRoom + ChatMessage models, API endpoints, and a reusable SecureChat frontend component. Messages are immutable with admin-only soft-delete.

### ~~ISSUE-031: Admin Has No Control Actions~~ ✅ RESOLVED
- **Fixed in**: Phase 5b — Built role change, activate/deactivate, and delete user endpoints + UI controls in Admin Dashboard.

---

## New Issues (Phase 5c — UX & Workflow)

### ISSUE-032: Patient DOB Shows "Invalid Date" in Doctor Panel 🟡
- **Problem**: In the doctor dashboard's patient list, the patient's date of birth displays as "Invalid Date" because the `MappingPatient` response doesn't include `date_of_birth`.
- **Impact**: Doctor sees broken data for connected patients
- **Fix**: Either include `date_of_birth` in the `PatientListItem` backend response, or remove the DOB display from the doctor's patient card
- **TODO Phase**: Phase 5c

### ISSUE-033: Patient Cannot Book Appointment — 422 Error 🔴
- **Problem**: `POST /api/appointments` returns 422 Unprocessable Content when a patient tries to book an appointment from the dashboard.
- **Impact**: Core booking workflow is broken
- **Fix**: Debug the appointment creation schema — likely a field mismatch between frontend form payload and backend `AppointmentCreate` schema (e.g. `doctor_id` not being sent or wrong format)
- **TODO Phase**: Phase 5c

### ISSUE-034: No "Chat with Patient" Action from Doctor's Patient List 🟠
- **Problem**: After a doctor links a patient, there is no button or action to start a secure chat with that specific patient from the patient list.
- **Impact**: Chat feature exists but has no natural entry point from the doctor-patient relationship view
- **Fix**: Add a "Chat" icon button per patient row that either opens an existing DIRECT room or creates one automatically
- **TODO Phase**: Phase 5c

### ISSUE-035: UUID Input Required for All Relationships — No Discovery 🔴
- **Problem**: Adding a patient, referring a doctor, or creating a care team requires manually copying+pasting UUIDs. There's no way for patients to discover/search for doctors, or for doctors to browse available patients.
- **Impact**: Unusable for real workflows — users must communicate IDs out-of-band
- **Fix**: Build dedicated pages:
  - **Patient → Doctor Discovery Page**: Browse available doctors by specialization, request medical assistance with a brief problem description
  - **Doctor → Patient Requests Page**: See incoming patient requests with problem descriptions, accept/decline cases
  - Replace manual UUID inputs with searchable dropdowns or request-based flows
- **TODO Phase**: Phase 5c

### ISSUE-036: Doctor Cannot View Patient's Medical Data 🟠
- **Problem**: Once a doctor is linked to a patient, they have no way to view the patient's profile details (medical history, allergies, vitals, insurance, medications, etc.).
- **Impact**: Doctors cannot perform their primary function — reviewing patient health data
- **Fix**: Add a patient detail view accessible from the doctor's patient list showing all profile fields, care teams, treatment plans, reports, and adherence data
- **TODO Phase**: Phase 5c

---

## Summary Matrix

| Severity | Total | Resolved | Open |
|----------|-------|----------|------|
| 🔴 Critical | 7 | 5 | 2 (ISSUE-033, 035) |
| 🟠 High | 9 | 7 | 2 (ISSUE-034, 036) |
| 🟡 Medium | 9 | 8 | 1 (ISSUE-032) |
| 🔵 Low | 11 | 11 | 0 |
| **Total** | **36** | **31** | **5** |
