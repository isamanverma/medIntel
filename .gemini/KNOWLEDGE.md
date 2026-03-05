# MedIntel — Project Knowledge Base

> Structured reference of everything a developer needs to know about this codebase.

---

## 1. Project Identity

| Key | Value |
|-----|-------|
| Name | MedIntel |
| Type | AI-powered healthcare intelligence platform |
| Stage | Early foundation (auth only, dashboards placeholder) |
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

### Authentication Flow (Hybrid BFF)
```
Browser → Next.js BFF (/api/auth/*) → FastAPI (/api/auth/*)
                ↓
    Sets HttpOnly cookie (JWT)
                ↓
    Returns UserPublic only (no token exposed)
```

1. **Signup/Login**: Browser → BFF API route → forwards to FastAPI → BFF extracts JWT, sets HttpOnly cookie, returns user payload only
2. **Session Check**: `SessionProvider` calls `/api/auth/me` → BFF reads cookie → forwards as Bearer token to FastAPI → returns user data
3. **Logout**: BFF sets `maxAge: 0` on the cookie to expire it
4. **Middleware**: Reads JWT from cookie, decodes payload (no signature verification), redirects based on role

### Data Flow
```
Browser ──cookie auto-sent──→ FastAPI ──SQLModel──→ Supabase PostgreSQL
```
For data APIs (not auth), the browser talks directly to FastAPI with the HttpOnly cookie included automatically.

### Layer Separation
| Layer | Location | Responsibility |
|-------|----------|----------------|
| HTTP | `api/auth.py` | Parse requests, return responses |
| Business Logic | `services/auth_service.py` | Hashing, JWT, DB queries |
| Data | `models/*.py` | SQLModel table definitions |
| Config | `core/config.py` | Environment variables |
| Database | `db/engine.py` | Async engine, session factory |

---

## 4. Database Schema

### Tables (9 total)
| Table | Purpose | Key Relations |
|-------|---------|---------------|
| `users` | Core auth data | parent of profiles |
| `patient_profiles` | Extended patient info | FK → users |
| `doctor_profiles` | Extended doctor info | FK → users |
| `patient_doctor_mappings` | Who treats whom | FK → patient_profiles, doctor_profiles |
| `appointments` | Scheduled visits | FK → patient_profiles, doctor_profiles |
| `treatment_plans` | Care plans | FK → patient_profiles, doctor_profiles |
| `medications` | Drugs in a plan | FK → treatment_plans |
| `adherence_logs` | Dose tracking | FK → medications, patient_profiles |
| `medical_reports` | Uploaded docs | FK → patient_profiles, users |
| `agent_insights` | AI analysis results | FK → patient_profiles |

### Design Conventions
- **Primary keys**: UUID with `server_default=text("gen_random_uuid()")`
- **Timestamps**: `created_at` and `updated_at` with `timezone=True`
- **Enums**: Centralized in `models/enums.py` (UserRole, AppointmentStatus, etc.)
- **SA Columns**: Use `sa_column=Column(...)` for full SQLAlchemy control

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

### Frontend (`frontend/.env.local`)
| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_BACKEND_URL` | ❌ (default: `http://localhost:8000`) | FastAPI URL |
| `NEXT_PUBLIC_APP_URL` | ❌ (default: `http://localhost:3000`) | Used for Secure cookie flag |

---

## 6. File Inventory

### Backend (12 active files)
| File | LOC | Purpose |
|------|-----|---------|
| `main.py` | 95 | App entry, CORS, lifespan, routers |
| `api/auth.py` | 183 | Auth HTTP endpoints |
| `services/auth_service.py` | 280 | Auth business logic |
| `core/config.py` | 61 | Settings from env |
| `db/engine.py` | 80 | Async engine + sessions |
| `models/user.py` | 199 | User model + schemas |
| `models/profiles.py` | 67 | Patient/Doctor profiles |
| `models/appointment.py` | 74 | Appointment model |
| `models/treatment.py` | 94 | Treatment + Medication |
| `models/report.py` | 66 | Medical reports |
| `models/adherence.py` | 61 | Adherence logs |
| `models/insight.py` | 68 | AI insights |
| `models/mapping.py` | 64 | Patient-Doctor mapping |
| `models/enums.py` | 51 | Enum definitions |

### Frontend (21 files)
| File | LOC | Purpose |
|------|-----|---------|
| `app/layout.tsx` | 45 | Root layout, fonts, SessionProvider |
| `app/page.tsx` | 273 | Landing/marketing page |
| `app/(auth)/login/page.tsx` | 308 | Login form with role toggle |
| `app/(auth)/signup/page.tsx` | 414 | Signup form with validation |
| `app/patient/dashboard/page.tsx` | 278 | Patient portal (hardcoded) |
| `app/doctor/dashboard/page.tsx` | 294 | Doctor portal (hardcoded) |
| `app/admin/dashboard/page.tsx` | 212 | Admin portal (hardcoded) |
| `app/api/auth/login/route.ts` | 122 | BFF login proxy |
| `app/api/auth/signup/route.ts` | 140 | BFF signup proxy |
| `app/api/auth/me/route.ts` | 86 | BFF session check |
| `app/api/auth/logout/route.ts` | 57 | BFF logout (cookie expiry) |
| `components/providers/SessionProvider.tsx` | 184 | Auth context provider |
| `components/ui/Navbar.tsx` | 207 | Global navbar |
| `components/ui/Footer.tsx` | 135 | Global footer |
| `lib/api-client.ts` | 184 | Typed fetch wrapper |
| `middleware.ts` | 159 | JWT route protection |

---

## 7. Dev Commands

```bash
# ── Backend ──
cd backend
uv sync                                          # Install dependencies
uv run uvicorn app.main:app --reload              # Dev server on :8000
uv run alembic upgrade head                       # Run migrations
uv run alembic revision --autogenerate -m "msg"   # Create migration

# ── Frontend ──
cd frontend
npm install                                       # Install dependencies
npm run dev                                       # Dev server on :3000
npm run build                                     # Production build
npm run lint                                      # Biome lint

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

## 9. API Endpoints (Currently Implemented)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | ❌ | Create user, return token |
| POST | `/api/auth/login` | ❌ | Verify creds, return token |
| GET | `/api/auth/me` | ✅ Bearer | Get current user profile |
| GET | `/health` | ❌ | Health check |

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

1. **300 LOC limit** — No file exceeds 300 lines of code
2. **SRP** — Single responsibility per module
3. **Business logic in backend only** — Frontend is display + routing
4. **Zero cost** — All services must use free tiers (Supabase, Ollama, Vercel/Render)
5. **uv for Python** — All Python commands use `uv run` / `uv sync`
6. **Git Bash terminal** — Default shell is Git Bash on Windows
