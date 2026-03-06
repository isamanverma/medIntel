# MedIntel — Project Knowledge Base

> Structured reference of everything a developer needs to know about this codebase.

---

## 1. Project Identity

| Key | Value |
|-----|-------|
| Name | MedIntel |
| Type | AI-powered healthcare intelligence platform |
| Stage | Production-ready backend, interactive dashboards (Phases 1–5b complete) |
| User Roles | Patient, Doctor, Admin |
| Monorepo | `backend/` (FastAPI) + `frontend/` (Next.js) |

---

## 2. Technology Stack

### Backend
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | FastAPI | latest |
| ORM | SQLModel (SQLAlchemy 2.0 async) | latest |
| DB Driver | asyncpg | latest |
| Database | Supabase PostgreSQL | Free tier |
| Migrations | Alembic | latest |
| Password Hash | bcrypt | latest |
| JWT | python-jose | latest |
| Rate Limiting | slowapi | latest |
| Python | 3.13+ | 3.13 |
| Package Manager | uv | latest |

### Frontend
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js | 16 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | v4 |
| Icons | lucide-react | latest |
| Linter | Biome | latest |
| Package Manager | npm | latest |

---

## 3. Architecture Patterns

### Authentication Flow (Hybrid BFF + Role Validation)
```
Browser → Next.js BFF (/api/auth/*) → FastAPI (/api/auth/*)
                ↓
    Validates user role matches expected_role
                ↓
    Sets HttpOnly cookie (JWT)
                ↓
    Returns UserPublic only (no token exposed)
```

1. **Signup/Login**: Browser → BFF API route → forwards to FastAPI (with `expected_role`) → BFF extracts JWT, sets HttpOnly cookie, returns user payload only
2. **Role Validation**: Login rejects if user.role ≠ expected_role (e.g., Doctor cannot login via Admin portal)
3. **Session Check**: `SessionProvider` calls `/api/auth/me` → BFF reads cookie → forwards as Bearer token to FastAPI → returns user data
4. **Logout**: BFF sets `maxAge: 0` on the cookie to expire it
5. **Middleware**: Reads JWT from cookie, decodes payload (no signature verification), redirects based on role

### Data Flow
```
Browser ──cookie auto-sent──→ FastAPI ──SQLModel──→ Supabase PostgreSQL
```
For data APIs (not auth), the browser talks directly to FastAPI with the HttpOnly cookie included automatically.

### Layer Separation
| Layer | Location | Responsibility |
|-------|----------|----------------|
| HTTP | `api/*.py` | Parse requests, return responses |
| Business Logic | `services/auth_service.py` | Hashing, JWT, DB queries |
| Data | `models/*.py` | SQLModel table definitions |
| Config | `core/config.py` | Environment variables + feature flags |
| Security | `middleware/csrf.py` | CSRF double-submit cookie |
| Database | `db/engine.py` | Async engine, session factory |

---

## 4. Database Schema

### Tables (15 total)
| Table | Purpose | Key Relations |
|-------|---------|---------------|
| `users` | Core auth data | parent of profiles |
| `patient_profiles` | Extended patient info (medical, insurance, address) | FK → users |
| `doctor_profiles` | Extended doctor info | FK → users |
| `patient_doctor_mappings` | Who treats whom | FK → patient_profiles, doctor_profiles |
| `appointments` | Scheduled visits | FK → patient_profiles, doctor_profiles |
| `treatment_plans` | Care plans | FK → patient_profiles, doctor_profiles |
| `medications` | Drugs in a plan | FK → treatment_plans |
| `adherence_logs` | Dose tracking | FK → medications, patient_profiles |
| `medical_reports` | Uploaded docs | FK → patient_profiles, users |
| `agent_insights` | AI analysis results | FK → patient_profiles |
| `referrals` | Doctor-to-doctor referrals | FK → doctor_profiles, patient_profiles |
| `care_teams` | Multi-doctor teams per patient | FK → patient_profiles |
| `care_team_members` | Doctors in a care team | FK → care_teams, doctor_profiles |
| `chat_rooms` | Secure chat rooms (DIRECT/GROUP) | FK → users (created_by) |
| `chat_participants` | Users in a chat room | FK → chat_rooms, users |
| `chat_messages` | Immutable messages (admin soft-delete) | FK → chat_rooms, users |

### Design Conventions
- **Primary keys**: UUID with `server_default=text("gen_random_uuid()")`
- **Timestamps**: `created_at` and `updated_at` with `timezone=True`
- **Enums**: Centralized in `models/enums.py` (UserRole, AppointmentStatus, etc.)
- **SA Columns**: Use `sa_column=Column(...)` for full SQLAlchemy control
- **Chat Immutability**: Messages cannot be edited/deleted by users; admin-only soft-delete via `is_deleted` flag

---

## 5. Environment Variables

### Backend (`backend/.env`)
| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | ✅ | none | PostgreSQL connection string |
| `SUPABASE_URL` | ✅ | none | Supabase project URL |
| `SUPABASE_KEY` | ✅ | none | Supabase anon key |
| `JWT_SECRET_KEY` | ✅ | ⚠️ hardcoded fallback | Token signing secret |
| `JWT_ALGORITHM` | ❌ | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | ❌ | `30` | Token TTL |
| `FRONTEND_URL` | ❌ | `http://localhost:3000` | CORS allowed origin |
| `TESTING` | ❌ | `false` | Disables rate limiting in test mode |
| `RATE_LIMIT_ENABLED` | ❌ | `true` | Toggle rate limiting |
| `CSRF_ENABLED` | ❌ | `false` | Toggle CSRF middleware |
| `CSRF_SECRET` | ❌ | auto-generated | CSRF cookie signing secret |

### Frontend (`frontend/.env.local`)
| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_BACKEND_URL` | ❌ (default: `http://localhost:8000`) | FastAPI URL |
| `NEXT_PUBLIC_APP_URL` | ❌ (default: `http://localhost:3000`) | Used for Secure cookie flag |

---

## 6. File Inventory

### Backend (25+ active files)
| File | Purpose |
|------|---------|
| `main.py` | App entry, CORS, CSRF, lifespan, routers |
| `api/auth.py` | Auth HTTP endpoints (signup, login with role validation, me) |
| `api/profiles.py` | Patient/Doctor profile CRUD (6 routes) |
| `api/appointments.py` | Appointment management (5 routes) |
| `api/mappings.py` | Patient-Doctor relationships (4 routes) |
| `api/treatments.py` | Treatment plans + medications (4 routes) |
| `api/reports.py` | Medical report metadata (3 routes) |
| `api/adherence.py` | Medication adherence tracking (3 routes) |
| `api/admin.py` | Admin stats, user list, assignments, user controls (8 routes) |
| `api/referrals.py` | Doctor-to-doctor referrals (4 routes) |
| `api/care_teams.py` | Multi-doctor care teams (4 routes) |
| `api/chat.py` | Secure chat rooms + messages (5 routes) |
| `deps.py` | Shared auth dependencies |
| `services/auth_service.py` | Auth business logic (bcrypt, JWT) |
| `core/config.py` | Enhanced settings with feature flags, CSRF, pagination |
| `middleware/csrf.py` | Double-submit cookie CSRF middleware |
| `db/engine.py` | Async engine + sessions + before_flush listener |
| `models/*.py` | 15 SQLModel tables |
| `tests/*.py` | 76 tests (auth, profiles, appointments, admin, chat, config, role login) |

### Frontend (25+ files)
| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout, fonts, SessionProvider, ToastProvider |
| `app/page.tsx` | Landing/marketing page |
| `app/(auth)/login/page.tsx` | Login form with explicit role validation |
| `app/(auth)/signup/page.tsx` | Signup form with validation |
| `app/patient/dashboard/page.tsx` | Patient portal (profile + appointments + chat) |
| `app/doctor/dashboard/page.tsx` | Doctor portal (patients + referrals + care teams + chat) |
| `app/admin/dashboard/page.tsx` | Admin portal (stats + controls + assignments + chat) |
| `app/api/auth/login/route.ts` | BFF login proxy (forwards role) |
| `app/api/auth/signup/route.ts` | BFF signup proxy |
| `app/api/auth/me/route.ts` | BFF session check |
| `app/api/auth/logout/route.ts` | BFF logout (cookie expiry) |
| `components/providers/SessionProvider.tsx` | Auth context provider |
| `components/chat/SecureChat.tsx` | Reusable real-time secure chat UI |
| `components/ui/Navbar.tsx` | Global navbar |
| `components/ui/Footer.tsx` | Global footer |
| `components/ui/Modal.tsx` | Reusable modal (escape, backdrop, scroll lock) |
| `components/ui/Toast.tsx` | Toast notification system (success/error/info) |
| `lib/api-client.ts` | Typed fetch wrapper + 57 API client functions |
| `lib/types.ts` | All shared TypeScript interfaces |
| `proxy.ts` | JWT route protection |

---

## 7. Dev Commands

```bash
# ── Backend ──
cd backend
uv sync                                          # Install dependencies
uv run uvicorn app.main:app --reload              # Dev server on :8000
uv run alembic upgrade head                       # Run migrations
uv run alembic revision --autogenerate -m "msg"   # Create migration
TESTING=1 uv run pytest tests/ -v                 # Run tests (rate limiting disabled)

# ── Frontend ──
cd frontend
npm install                                       # Install dependencies
npm run dev                                       # Dev server on :3000
npm run build                                     # Production build
npx tsc --noEmit                                  # Type check

# ── Both at once (Windows) ──
.\dev.ps1                                         # Launches both in separate terminals

# ── Both at once (macOS/Linux) ──
./dev.sh                                          # Launches both in tmux
```

---

## 8. Cookie Configuration

| Attribute | Value | Reason |
|-----------|-------|--------|
| `httpOnly` | `true` | JS cannot read → prevents XSS token theft |
| `secure` | `true` in prod | Only sent over HTTPS |
| `sameSite` | `lax` | Basic CSRF protection |
| `path` | `/` | Sent on all routes |
| `maxAge` | 1800 (30 min) | Matches JWT expiry |
| Name | `access_token` | Read by middleware + BFF |

---

## 9. API Endpoints (50 total)

### Auth (3 routes)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | ❌ | Create user, return token |
| POST | `/api/auth/login` | ❌ | Verify creds + role, return token |
| GET | `/api/auth/me` | ✅ Bearer | Get current user profile |

### Profiles (6 routes)
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/profiles/patient` | Patient |
| GET | `/api/profiles/patient/me` | Patient |
| PUT | `/api/profiles/patient/me` | Patient |
| POST | `/api/profiles/doctor` | Doctor |
| GET | `/api/profiles/doctor/me` | Doctor |
| PUT | `/api/profiles/doctor/me` | Doctor |

### Appointments (5 routes)
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/appointments` | Patient |
| GET | `/api/appointments/upcoming` | Any |
| GET | `/api/appointments/history` | Any |
| GET | `/api/appointments/{id}` | Any |
| PATCH | `/api/appointments/{id}/status` | Doctor |

### Mappings (4 routes)
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/mappings` | Doctor |
| GET | `/api/mappings/my-patients` | Doctor |
| GET | `/api/mappings/my-doctors` | Patient |
| DELETE | `/api/mappings/{id}` | Any |

### Treatments (4 routes)
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/treatments` | Doctor |
| GET | `/api/treatments/patient/{id}` | Any |
| PATCH | `/api/treatments/{id}/status` | Doctor |
| POST | `/api/treatments/{id}/medications` | Doctor |

### Reports (3 routes)
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/reports` | Doctor |
| GET | `/api/reports/patient/{id}` | Any |
| GET | `/api/reports/{id}` | Any |

### Adherence (3 routes)
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/adherence/log` | Patient |
| GET | `/api/adherence/history/{patient_id}` | Any |
| GET | `/api/adherence/stats/{patient_id}` | Any |

### Admin (8 routes)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/stats` | Admin | Platform statistics |
| GET | `/api/admin/users` | Admin | List all users |
| POST | `/api/admin/assignments` | Admin | Assign patient to doctor |
| GET | `/api/admin/assignments` | Admin | List assignments |
| DELETE | `/api/admin/assignments/{id}` | Admin | Remove assignment |
| PATCH | `/api/admin/users/{id}/role` | Admin | Change user role |
| PATCH | `/api/admin/users/{id}/status` | Admin | Activate/deactivate user |
| DELETE | `/api/admin/users/{id}` | Admin | Hard delete user |

### Referrals (4 routes)
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/referrals` | Doctor |
| GET | `/api/referrals/sent` | Doctor |
| GET | `/api/referrals/received` | Doctor |
| PATCH | `/api/referrals/{id}` | Doctor |

### Care Teams (4 routes)
| Method | Path | Auth |
|--------|------|------|
| POST | `/api/care-teams` | Doctor |
| POST | `/api/care-teams/{id}/members` | Doctor |
| GET | `/api/care-teams/patient/{id}` | Any |
| GET | `/api/care-teams/doctor/me` | Doctor |

### Secure Chat (5 routes)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/chat/rooms` | Any | Create chat room |
| GET | `/api/chat/rooms` | Any | List my rooms |
| POST | `/api/chat/rooms/{id}/messages` | Participant | Send message |
| GET | `/api/chat/rooms/{id}/messages` | Participant | Get message history |
| DELETE | `/api/chat/rooms/{id}/messages/{msg_id}` | Admin | Soft-delete message |

### BFF Proxy Routes (Frontend)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Proxy → FastAPI, set cookie |
| POST | `/api/auth/signup` | Proxy → FastAPI, set cookie |
| GET | `/api/auth/me` | Read cookie → forward as Bearer |
| POST | `/api/auth/logout` | Expire cookie |

---

## 10. Design System Tokens

Defined in `frontend/app/globals.css` via CSS custom properties with Tailwind v4 `@theme inline`.

| Token | Light | Dark |
|-------|-------|------|
| `--primary` | `#0ea5e9` (sky blue) | `#38bdf8` |
| `--secondary` | `#10b981` (emerald) | `#34d399` |
| `--accent` | `#8b5cf6` (violet) | `#a78bfa` |
| `--background` | `#ffffff` | `#0a0a0a` |
| `--foreground` | `#171717` | `#ededed` |
| `--muted` | `#f1f5f9` | `#1e293b` |
| `--card` | `#ffffff` | `#0f172a` |
| `--destructive` | `#ef4444` | `#ef4444` |
| `--border` | `#e2e8f0` | `#334155` |

---

## 11. Project Rules & Constraints

1. **SRP** — Single responsibility per module
2. **Business logic in backend only** — Frontend is display + routing
3. **Zero cost** — All services must use free tiers (Supabase, Gemini, Vercel/Render)
4. **uv for Python** — All Python commands use `uv run` / `uv sync`
5. **Git Bash terminal** — Default shell is Git Bash on Windows
6. **TDD approach** — Tests written before or alongside implementation
7. **Immutable chat** — Users cannot edit/delete messages; admin soft-delete only
