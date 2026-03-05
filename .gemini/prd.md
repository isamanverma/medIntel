# MedIntel — Product Requirements Document

## Vision

MedIntel is a production-grade AI-driven healthcare intelligence platform for a capstone project. It serves patients, doctors, and admins through separate role-based dashboards.

## Core Features

### Implemented
1. **User Authentication** — Email/password signup & login with JWT tokens
2. **Role-Based Access** — Three roles: PATIENT, DOCTOR, ADMIN with route protection
3. **Hybrid BFF Auth** — HttpOnly cookie-based session via Next.js API proxy routes
4. **Landing Page** — Marketing page with features, stats, how-it-works, and CTA sections
5. **Dashboard Shells** — Placeholder dashboards for all three roles

### Planned (Not Yet Built)
6. **Patient Profiles** — Personal health info, emergency contacts, blood group
7. **Doctor Profiles** — Specialization, license number, NPI
8. **Appointments** — Scheduling, status tracking, meeting notes
9. **Treatment Plans** — Doctor-created plans with medications
10. **Medical Reports** — File upload, AI analysis status, AI summaries
11. **Medication Adherence** — Tracking taken/missed/late doses
12. **AI Agent Insights** — Report analysis, risk detection, triage recommendations
13. **Patient-Doctor Mapping** — Relationship management between patients and doctors

## Database Schema (9 Tables)

- `users` — Core user table with role, auth provider, active status
- `patient_profiles` — Extended patient info (FK → users)
- `doctor_profiles` — Extended doctor info (FK → users)
- `patient_doctor_mappings` — Many-to-many relationship
- `appointments` — Scheduled visits (FK → patient_profiles, doctor_profiles)
- `treatment_plans` — Care plans (FK → patient_profiles, doctor_profiles)
- `medications` — Drugs within treatment plans (FK → treatment_plans)
- `adherence_logs` — Medication tracking (FK → medications, patient_profiles)
- `medical_reports` — Uploaded documents (FK → patient_profiles, users)
- `agent_insights` — AI-generated clinical insights

## Non-Functional Requirements

- All files under 300 LOC
- Single responsibility per module
- Business logic in backend only
- API-first design
- No code duplication across layers

## Known Issues (From Code Review)

1. Admin dashboard missing role guard (any authenticated user can access)
2. Broken import in `backend/app/auth.py` (references non-existent `app.api.v1.auth`)
3. Hardcoded JWT secret default in config
4. Dead code: empty route files, unused `schemas.py`, stale `next-auth.d.ts`
5. `onupdate` lambda for `updated_at` columns won't fire with ORM pattern
6. No tests, no rate limiting, no `.env.example`
