# MedIntel — AI-Powered Healthcare Intelligence Platform

## Project Overview

MedIntel is an AI-driven healthcare intelligence ecosystem with a FastAPI backend and Next.js frontend. It serves three user roles: **Patient**, **Doctor**, and **Admin**.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.13+ · FastAPI · SQLModel · asyncpg · bcrypt · python-jose · slowapi |
| Database | Supabase PostgreSQL (via Alembic migrations) |
| Frontend | Next.js 16 · TypeScript 5 · Tailwind CSS v4 · Biome |
| Auth | Custom JWT + Hybrid BFF cookie proxy |

## Architecture

- **Backend** (`backend/`): FastAPI with domain-driven modules under `app/`
  - `api/auth.py` — Auth routes (signup, login, me) + rate limiting
  - `api/profiles.py` — Patient/Doctor profile CRUD (6 routes)
  - `api/appointments.py` — Appointment management (5 routes)
  - `api/mappings.py` — Patient-Doctor relationships (4 routes)
  - `api/treatments.py` — Treatment plans + medications (4 routes)
  - `api/reports.py` — Medical report metadata (3 routes)
  - `api/adherence.py` — Medication adherence tracking (3 routes)
  - `api/admin.py` — Admin stats, user list, patient assignments (5 routes)
  - `api/referrals.py` — Doctor-to-doctor referrals (4 routes)
  - `api/care_teams.py` — Multi-doctor care teams (4 routes)
  - `deps.py` — Shared auth dependencies (get_current_user, require_patient/doctor/admin)
  - `services/auth_service.py` — Business logic (bcrypt, JWT)
  - `models/` — 15 SQLModel tables (User, PatientProfile, DoctorProfile, Appointment, TreatmentPlan, Medication, MedicalReport, AdherenceLog, AgentInsight, Referral, CareTeam, CareTeamMember, ChatRoom, ChatParticipant, ChatMessage)
  - `core/config.py` — Enhanced settings with feature flags, CSRF, pagination, security config
  - `middleware/csrf.py` — Double-submit cookie CSRF middleware (configurable)
  - `db/engine.py` — Async engine + session factory + before_flush listener
  - `tests/` — 76 tests (pytest + httpx + pytest-asyncio)

- **Frontend** (`frontend/`): Next.js App Router
  - `app/(auth)/` — Login/signup pages with explicit role validation
  - `app/patient/dashboard/` — Patient portal (profile + appointments + chat + care team)
  - `app/doctor/dashboard/` — Doctor portal (patients + referrals + care teams + appointments + chat)
  - `app/admin/dashboard/` — Admin portal (stats + user management + assignments + chat)
  - `app/api/auth/` — BFF proxy routes (login, signup, me, logout)
  - `lib/api-client.ts` — 57 API client functions
  - `lib/types.ts` — All TypeScript interfaces (including ChatRoom, ChatMessage)
  - `components/providers/SessionProvider.tsx` — Custom auth context
  - `components/ui/Modal.tsx` — Reusable modal component
  - `components/ui/Toast.tsx` — Toast notification system
  - `components/chat/SecureChat.tsx` — Reusable real-time chat UI
  - `proxy.ts` — JWT-based route protection

## Current Status

- ✅ Auth flow fully working with strict role validation (Doctor cannot login as Admin)
- ✅ Database schema defined (15 tables with relationships including Chat)
- ✅ All CRUD APIs implemented (50 endpoints, 76 tests passing)
- ✅ All dashboards interactive with live API data (Phases 1–5b complete)
- ✅ Rate limiting on auth endpoints + Double-submit cookie CSRF
- ✅ Multi-section tabbed patient profile
- ✅ Secure immutable chat system with admin soft-delete
- ✅ Admin user controls (role change, activate/deactivate, hard delete)
- ✅ All 31 issues resolved (ISSUE-001 through ISSUE-031)
- ❌ AI/ML intelligence layer not started (Phase 6)

## Running Locally

```bash
# Backend
cd backend
uv run uvicorn app.main:app --reload

# Frontend
cd frontend
npm run dev
```

## Key Commands

```bash
# Backend dependencies
cd backend && uv sync

# Frontend dependencies
cd frontend && npm install

# Database migrations
cd backend && uv run alembic upgrade head

# Run tests (TESTING=1 disables rate limiting)
cd backend && TESTING=1 uv run pytest tests/ -v
```

## Capstone Roadmap

| Document | Purpose |
|----------|---------|
| [.gemini/TODO.md](.gemini/TODO.md) | 7-phase roadmap (Phases 1–5 complete) |
| [.gemini/ISSUES.md](.gemini/ISSUES.md) | 27 issues tracked, 27 resolved |
| [.gemini/KNOWLEDGE.md](.gemini/KNOWLEDGE.md) | Complete project knowledge base |
| [.gemini/prd.md](.gemini/prd.md) | Product requirements document |
