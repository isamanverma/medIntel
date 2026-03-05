# MedIntel — AI-Powered Healthcare Intelligence Platform

## Project Overview

MedIntel is an AI-driven healthcare intelligence ecosystem with a FastAPI backend and Next.js frontend. It serves three user roles: **Patient**, **Doctor**, and **Admin**.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.13+ · FastAPI · SQLModel · asyncpg · bcrypt · python-jose |
| Database | Supabase PostgreSQL (via Alembic migrations) |
| Frontend | Next.js 16 · TypeScript 5 · Tailwind CSS v4 · Biome |
| Auth | Custom JWT + Hybrid BFF cookie proxy |

## Architecture

- **Backend** (`backend/`): FastAPI with domain-driven modules under `app/`
  - `api/auth.py` — Auth routes (signup, login, me)
  - `api/profiles.py` — Patient/Doctor profile CRUD (6 routes)
  - `api/appointments.py` — Appointment management (5 routes)
  - `api/mappings.py` — Patient-Doctor relationships (4 routes)
  - `api/treatments.py` — Treatment plans + medications (4 routes)
  - `api/reports.py` — Medical report metadata (3 routes)
  - `api/adherence.py` — Medication adherence tracking (3 routes)
  - `deps.py` — Shared auth dependencies (get_current_user, require_patient/doctor/admin)
  - `services/auth_service.py` — Business logic (bcrypt, JWT)
  - `models/` — 9 SQLModel tables (User, PatientProfile, DoctorProfile, Appointment, TreatmentPlan, Medication, MedicalReport, AdherenceLog, AgentInsight)
  - `core/config.py` — Settings from environment variables
  - `db/engine.py` — Async engine + session factory
  - `tests/` — 30 tests (pytest + httpx + pytest-asyncio)

- **Frontend** (`frontend/`): Next.js App Router
  - `app/(auth)/` — Login/signup pages with role toggle
  - `app/patient/dashboard/` — Patient portal (placeholder)
  - `app/doctor/dashboard/` — Doctor portal (placeholder)
  - `app/admin/dashboard/` — Admin portal (placeholder)
  - `app/api/auth/` — BFF proxy routes (login, signup, me, logout)
  - `components/providers/SessionProvider.tsx` — Custom auth context
  - `proxy.ts` — JWT-based route protection

## Current Status

- ✅ Auth flow fully working (signup → login → session → logout)
- ✅ Database schema defined (9 tables with relationships)
- ✅ All CRUD APIs implemented (25 endpoints, 30 tests passing)
- ⚠️ Dashboards have placeholder/mock data (Phase 3)
- ❌ AI/ML intelligence layer not started

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

# Run tests
cd backend && uv run pytest tests/ -v
```

## Capstone Roadmap

| Document | Purpose |
|----------|---------|
| [.gemini/TODO.md](.gemini/TODO.md) | 7-phase roadmap (Phases 1-2 complete) |
| [.gemini/ISSUES.md](.gemini/ISSUES.md) | 27 issues tracked, 19 resolved |
| [.gemini/KNOWLEDGE.md](.gemini/KNOWLEDGE.md) | Complete project knowledge base |
| [.gemini/prd.md](.gemini/prd.md) | Product requirements document |
