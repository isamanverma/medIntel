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
13. **Live Interactive Dashboards** — Profile onboarding, appointment booking, appointment management, admin user table
14. **Rate Limiting** — slowapi on auth endpoints (3/min signup, 5/min login)
15. **Reusable UI Components** — Modal, Toast notification system
16. **Comprehensive Patient Data** — Allergies, chronic conditions, vitals, insurance, demographics
17. **Admin Patient-Doctor Assignment** — Admin assigns patients to doctors
18. **Doctor Referral System** — Refer patients to other doctors with reason & status tracking
19. **Multi-Doctor Care Teams** — Multiple doctors collaborating on a single patient case

### Planned (Phase 5 Frontend & Polish)
20. **CSRF Protection** — Double-submit cookie pattern

### Planned (Phase 6)
21. **AI Agent Insights** — Report analysis, risk detection, triage recommendations (Google Gemini API)

## Database Schema (Current: 12 Tables, Planned: 13+)

### Current Tables
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
- `referrals` — Doctor-to-doctor referrals with status (PENDING/ACCEPTED/DECLINED)
- `care_teams` — Named care teams per patient
- `care_team_members` — Doctors in a care team with roles (PRIMARY/CONSULTANT/SPECIALIST)

## Non-Functional Requirements

- All files under 300 LOC
- Single responsibility per module
- Business logic in backend only
- API-first design
- No code duplication across layers
- Rate limiting on sensitive endpoints

## Known Issues

1. ~~No rate limiting on auth endpoints~~ ✅ RESOLVED (Phase 4)
2. No CSRF protection beyond SameSite cookies (Phase 5)
