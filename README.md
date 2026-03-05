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
      api/auth.py           # Auth endpoints (signup, login, me)
      services/              # Business logic
      models/                # SQLModel table definitions (9 tables)
      core/config.py         # Settings from env vars
      db/engine.py           # Async database engine
    alembic/                 # Database migrations
    pyproject.toml

  frontend/
    app/
      (auth)/                # Login, signup pages
      patient/dashboard/     # Patient portal
      doctor/dashboard/      # Doctor portal
      admin/dashboard/       # Admin portal
      api/auth/              # BFF proxy routes (login, signup, me, logout)
    components/
      providers/SessionProvider.tsx  # Auth context
      ui/                    # Navbar, Footer
    lib/
      api-client.ts          # Typed fetch wrapper for backend calls
    middleware.ts             # JWT-based route protection
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

9 tables: `users`, `patient_profiles`, `doctor_profiles`, `patient_doctor_mappings`, `appointments`, `treatment_plans`, `medications`, `adherence_logs`, `medical_reports`, `agent_insights`.

Currently only the `users` table is actively used (auth). The rest have models defined but no API endpoints yet.

To create a new migration after changing models:

```bash
cd backend
uv run alembic revision --autogenerate -m "describe the change"
uv run alembic upgrade head
```

## Current State

What works:
- Signup, login, logout, session persistence
- Role-based route protection (middleware + per-page guards)
- Landing page, three dashboard shells

What does not work yet:
- Profile management (models exist, no API)
- Appointments (models exist, no API)
- Reports, treatment plans, adherence tracking (models exist, no API)
- Dashboards show hardcoded mock data, not real data
- No AI/ML features
- No tests

## Documentation

All project docs live under `.gemini/`:

| File | What it is |
|------|-----------|
| `TODO.md` | Phased roadmap (7 phases, cleanup to AI) |
| `ISSUES.md` | 25 known issues ranked by severity |
| `KNOWLEDGE.md` | Full technical knowledge base |
| `prd.md` | Product requirements |

## Common Issues

**Backend won't start**: Check that `DATABASE_URL` in `backend/.env` is correct and the Supabase project is running. Make sure you ran `uv run alembic upgrade head`.

**Frontend can't reach backend**: Make sure the backend is running on port 8000. If using a different port, set `NEXT_PUBLIC_BACKEND_URL` in `frontend/.env.local`.

**Login works but dashboard redirects to login**: The cookie might not be setting. Check that both servers are on `localhost` (not `127.0.0.1` for one and `localhost` for the other).
