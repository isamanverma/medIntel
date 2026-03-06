# MedIntel

Healthcare intelligence platform. FastAPI backend, Next.js frontend, Supabase PostgreSQL.

Three roles: Patient, Doctor, Admin. Each gets a separate dashboard.

## Prerequisites

- Python 3.13+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- A Supabase project (free tier works)

## Setup

### 1. Clone and configure environment

```bash
git clone <repo-url>
cd medintel
```

Create `backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://<user>:<password>@<host>:<port>/<db>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_KEY=<anon-key>
JWT_SECRET_KEY=<generate-a-random-string>
FRONTEND_URL=http://localhost:3000
```

No `.env` file is needed for the frontend in local dev. It defaults to `http://localhost:8000` for the backend.

### 2. Backend

```bash
cd backend
uv sync
```

Run database migrations:

```bash
uv run alembic upgrade head
```

Start the dev server:

```bash
uv run uvicorn app.main:app --reload
```

Backend runs on `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

### 4. Both at once

Windows:

```powershell
.\dev.ps1
```

macOS/Linux:

```bash
./dev.sh
```

## Project Structure

```
medintel/
  backend/
    app/
      api/                   # Feature endpoints (auth, profiles, appointments, chat, admin, etc.)
      services/              # Business logic
      models/                # SQLModel table definitions (15 tables)
      core/config.py         # Enhanced settings with feature flags
      middleware/csrf.py     # Double-submit cookie CSRF middleware
      db/engine.py           # Async database engine
    alembic/                 # Database migrations
    tests/                   # Pytest suite (76 tests)
    pyproject.toml

  frontend/
    app/
      (auth)/                # Login, signup pages with role validation
      patient/dashboard/     # Patient portal (profile + appointments + chat)
      doctor/dashboard/      # Doctor portal (patients + referrals + care teams + chat)
      admin/dashboard/       # Admin portal (stats + controls + assignments + chat)
      api/auth/              # BFF proxy routes (login, signup, me, logout)
    components/
      providers/SessionProvider.tsx  # Auth context
      chat/SecureChat.tsx    # Reusable secure chat component
      ui/                    # Navbar, Footer, Modal, Toast
    lib/
      api-client.ts          # Typed fetch wrapper (57 functions)
      types.ts               # All shared TypeScript interfaces
    proxy.ts                 # JWT-based route protection
```

## How Auth Works

We use a BFF (Backend-for-Frontend) pattern:

1. Browser submits login/signup to Next.js API routes (`/api/auth/*`).
2. Next.js forwards to FastAPI, gets back a JWT + user data.
3. Next.js sets the JWT as an HttpOnly cookie (browser JS cannot read it).
4. Next.js returns only the user profile to the browser.
5. On subsequent requests, the cookie is sent automatically.
6. `SessionProvider` calls `/api/auth/me` on mount to check the session.
7. `middleware.ts` reads the cookie for route protection (redirect to login or correct dashboard).

## Database

15 tables: `users`, `patient_profiles`, `doctor_profiles`, `patient_doctor_mappings`, `appointments`, `treatment_plans`, `medications`, `adherence_logs`, `medical_reports`, `agent_insights`, `referrals`, `care_teams`, `care_team_members`, `chat_rooms`, `chat_participants`, `chat_messages`.

To create a new migration after changing models:

```bash
cd backend
uv run alembic revision --autogenerate -m "describe the change"
uv run alembic upgrade head
```

## Current State

What works:
- Signup, login, logout, session persistence with rate limiting and strict role validation
- Role-based route protection (middleware + per-page guards)
- Landing page and all three dashboard portals
- **Backend Complete via Phase 5b**: 50 API endpoints spanning Profiles, Appointments, Adherence, Mappings, Referrals, Care Teams, Admin Assignments, Secure Chat, and Admin Controls.
- **Frontend Connect**: Interactive Next.js dashboards hitting real APIs for all Phase 1-5b features, including a real-time secure chat UI.
- Testing Setup: 76 tests spanning the entire FastAPI backend suite.

What does not work yet:
- No AI/ML features yet (Phase 6).

## Documentation

All project docs live under `.gemini/`:

| File | What it is |
|------|-----------|
| `TODO.md` | 7-phase roadmap (Phases 1–5b complete) |
| `ISSUES.md` | 31 issues tracked, all 31 resolved |
| `KNOWLEDGE.md` | Complete technical knowledge base |
| `prd.md` | Product requirements document |

## Common Issues

**Backend won't start**: Check that `DATABASE_URL` in `backend/.env` is correct and the Supabase project is running. Make sure you ran `uv run alembic upgrade head`.

**Frontend can't reach backend**: Make sure the backend is running on port 8000. If using a different port, set `NEXT_PUBLIC_BACKEND_URL` in `frontend/.env.local`.

**Login works but dashboard redirects to login**: The cookie might not be setting. Check that both servers are on `localhost` (not `127.0.0.1` for one and `localhost` for the other).
