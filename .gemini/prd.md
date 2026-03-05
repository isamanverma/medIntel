# MedIntel — Product Requirements Document

## Vision

MedIntel is a production-grade AI-driven healthcare intelligence platform for a capstone project. It serves patients, doctors, and admins through separate role-based dashboards.

## Core Features

### Implemented
1. **User Authentication** — Email/password signup & login with JWT tokens
2. **Role-Based Access** — Three roles: PATIENT, DOCTOR, ADMIN with route protection
3. **Hybrid BFF Auth** — HttpOnly cookie-based session via Next.js API proxy routes
4. **Landing Page** — Marketing page with features, stats, how-it-works, and CTA sections
5. **Patient Profiles** — Personal health info, emergency contacts, blood group
6. **Doctor Profiles** — Specialization, license number
7. **Appointments** — Scheduling, status tracking, meeting notes
8. **Treatment Plans** — Doctor-created plans with medications
9. **Medical Reports** — File metadata tracking
10. **Medication Adherence** — Tracking taken/missed/late doses
11. **Patient-Doctor Mapping** — Relationship management between patients and doctors
12. **Admin Stats** — Real-time platform statistics dashboard
13. **Live Dashboards** — All 3 dashboards connected to real API data (no hardcoded data)

### Planned (Not Yet Built)
14. **AI Agent Insights** — Report analysis, risk detection, triage recommendations
15. **Profile Onboarding** — Post-signup profile completion flow

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

1. No rate limiting on auth endpoints (Phase 4)
2. No CSRF protection beyond SameSite cookies (Phase 4)
