# MedIntel — Known Issues & Technical Debt

> Comprehensive inventory of every issue found during code review.
> Each issue links to the TODO phase where it will be resolved.

---

## 🔴 Critical — Security & Correctness

### ISSUE-001: Admin Dashboard Missing Role Guard
- **File**: `frontend/app/admin/dashboard/page.tsx` (lines 22–26)
- **Problem**: Only checks `status === "unauthenticated"`, never verifies `session.user.role === "ADMIN"`. Any logged-in patient or doctor can access the admin dashboard.
- **Impact**: Unauthorized access to admin panel
- **Fix**: Add role check matching the pattern in patient/doctor dashboards
- **TODO Phase**: Phase 1.1

### ISSUE-002: Hardcoded JWT Secret Default
- **File**: `backend/app/core/config.py` (line 15–18)
- **Problem**: `JWT_SECRET_KEY` defaults to `"medintel-jwt-secret-change-in-production"` when the env var is missing. If deployed without setting this, tokens are signed with a predictable key.
- **Impact**: Token forgery in production
- **Fix**: Raise `ValueError` if `JWT_SECRET_KEY` is not explicitly set, or at minimum log a loud warning
- **TODO Phase**: Phase 1.2

### ISSUE-003: No Rate Limiting on Auth Endpoints
- **File**: `backend/app/api/auth.py` (signup, login routes)
- **Problem**: Zero rate limiting. An attacker can brute-force passwords or spam account creation endlessly.
- **Impact**: Credential stuffing, denial of service, spam accounts
- **Fix**: Add `slowapi` or a custom rate limiter middleware (e.g., 5 login attempts/minute per IP)
- **TODO Phase**: Phase 4

### ISSUE-004: Signup Race Condition (Duplicate Email)
- **File**: `backend/app/services/auth_service.py` → `create_user()`
- **Problem**: Checks `get_user_by_email()` then does `session.add()` + `session.commit()` — not atomic. Two simultaneous signups with the same email can both pass the check, causing a database constraint error or duplicate accounts.
- **Impact**: Unhandled 500 error, potential duplicate user
- **Fix**: Wrap in try/except for `IntegrityError` and return `EmailAlreadyExistsError`
- **TODO Phase**: Phase 2.1

---

## 🟠 High — Broken Code & Dead Files

### ISSUE-005: Broken Import Shim — `backend/app/auth.py`
- **File**: `backend/app/auth.py` (line 9)
- **Problem**: `from app.api.v1.auth import router` — the module `app.api.v1` does **not exist**. This file will crash with `ModuleNotFoundError` if anything imports it.
- **Impact**: Import error if referenced; currently harmless since `main.py` imports from `app.api.auth` directly
- **Fix**: Delete the file entirely
- **TODO Phase**: Phase 1.1

### ISSUE-006: Empty Route Files
- **Files**: `backend/app/routes/doctors.py`, `patients.py`, `reports.py` (all 0 bytes)
- **Problem**: Placeholder files that ship in the repo but contain zero code. Misleads developers into thinking functionality exists.
- **Impact**: Confusing project structure
- **Fix**: Delete the `routes/` directory; build real routes under `api/` when implementing Phase 2
- **TODO Phase**: Phase 1.1

### ISSUE-007: Empty `deps.py`
- **File**: `backend/app/deps.py` (0 bytes)
- **Problem**: Empty placeholder that was never implemented. Should hold reusable FastAPI dependencies like `get_current_user`.
- **Impact**: Dead code clutter
- **Fix**: Either delete now and recreate in Phase 2, or implement shared auth dependencies immediately
- **TODO Phase**: Phase 1.1 / Phase 2.1

### ISSUE-008: Unused `schemas.py`
- **File**: `backend/app/schemas.py` (118 lines)
- **Problem**: Contains `SignupRequest`, `LoginRequest`, `GoogleOAuthRequest`, `UserRead`, etc. — but **nothing imports from this file**. The actual auth routes define their own inline schemas.
- **Impact**: Duplicate type definitions, maintenance confusion
- **Fix**: Consolidate — either use this file as the single source of truth, or delete it and keep inline schemas
- **TODO Phase**: Phase 1.3

### ISSUE-009: Stale `next-auth.d.ts` Type Definitions
- **File**: `frontend/types/next-auth.d.ts` (3 KB)
- **Problem**: NextAuth was removed from the project and replaced with a custom BFF auth system, but the type declaration file for NextAuth still exists.
- **Impact**: Misleading types, potential build confusion
- **Fix**: Delete the file
- **TODO Phase**: Phase 1.1

---

## 🟡 Medium — Best Practice Violations

### ISSUE-010: `onupdate` Lambda Won't Fire with ORM Pattern
- **File**: `backend/app/models/user.py` (line 152)
- **Problem**: `onupdate=lambda: datetime.now(timezone.utc)` on the `updated_at` column. SQLAlchemy's `onupdate` callback fires during `session.execute(update(...))` (Core API), but **not** when using the ORM pattern (`session.add()` + `session.commit()` with attribute changes).
- **Impact**: `updated_at` column never auto-updates
- **Fix**: Use `@event.listens_for(Session, "before_flush")` or set `updated_at` explicitly in services
- **TODO Phase**: Phase 2

### ISSUE-011: SQL `echo=True` Left On
- **File**: `backend/app/db/engine.py` (line 29)
- **Problem**: `echo=True` logs every SQL statement to stdout. Fine for dev but leaks query details and slows down production.
- **Impact**: Performance penalty, log pollution, potential info leakage
- **Fix**: `echo=os.getenv("SQL_ECHO", "false").lower() == "true"`
- **TODO Phase**: Phase 1.2

### ISSUE-012: Mixed Folder Conventions for Routes
- **Files**: `backend/app/api/auth.py` vs `backend/app/routes/` directory
- **Problem**: Two competing folder structures exist. The actual working router is in `api/`, but empty files exist in `routes/`. No clear convention.
- **Impact**: Developer confusion, inconsistent project structure
- **Fix**: Pick `api/` as the standard, delete `routes/`, document the convention
- **TODO Phase**: Phase 1.1

### ISSUE-013: Frontend Type Duplication
- **Files**: `frontend/lib/api-client.ts` and `frontend/components/providers/SessionProvider.tsx`
- **Problem**: `UserRole`, `UserPublic`, and `SessionUser` interfaces are defined independently in both files. They can drift out of sync.
- **Impact**: Type mismatch bugs, maintenance burden
- **Fix**: Define shared types once in `lib/types.ts`, import everywhere
- **TODO Phase**: Phase 1.3

### ISSUE-014: Duplicate Schema Definitions in Backend
- **Files**: `backend/app/models/user.py`, `backend/app/schemas.py`, `backend/app/api/auth.py`
- **Problem**: `LoginRequest` is defined inline in `api/auth.py`, separately in `schemas.py`, and response types overlap with `models/user.py`. Three sources of truth.
- **Impact**: Maintenance burden, risk of type drift
- **Fix**: Single source of truth for request/response schemas
- **TODO Phase**: Phase 1.3

### ISSUE-015: No `.env.example` File
- **Problem**: The backend requires `DATABASE_URL`, `JWT_SECRET_KEY`, `SUPABASE_URL`, etc., but there's no `.env.example` template showing which variables are needed and their expected formats.
- **Impact**: New developers (or evaluators) can't set up the project easily
- **Fix**: Create `.env.example` with placeholder values
- **TODO Phase**: Phase 1.2

### ISSUE-016: No CSRF Protection Beyond SameSite
- **Problem**: Auth BFF routes use `SameSite=Lax` cookies, which prevents CSRF on top-level navigations but not on programmatic `fetch()` calls from injected third-party scripts.
- **Impact**: Potential CSRF on state-changing POST endpoints
- **Fix**: Add a CSRF token or double-submit cookie pattern for state-changing operations
- **TODO Phase**: Phase 4

---

## 🔵 Low — Hardcoded Data & Cosmetic Issues

### ISSUE-017: All Doctors See Identical Appointments
- **File**: `frontend/app/doctor/dashboard/page.tsx` (lines 84–115)
- **Problem**: Hardcoded static array of 5 fake patients. Every doctor account sees Sarah Johnson, Michael Chen, etc.
- **Impact**: App looks fake during evaluation
- **Fix**: Replace with API call to `/api/appointments/upcoming`
- **TODO Phase**: Phase 3.3

### ISSUE-018: All Patients See Identical Health Data
- **File**: `frontend/app/patient/dashboard/page.tsx` (lines 55–106)
- **Problem**: Hardcoded stats (87/100 health score, BP 120/80, heart rate 72, BMI 23.4), fake recent activity with stale dates ("Dec 15, 2024").
- **Impact**: App looks fake, dates are outdated
- **Fix**: Replace with real API data or at minimum show "No data yet" empty states
- **TODO Phase**: Phase 3.2

### ISSUE-019: Admin Dashboard Fake System Stats
- **File**: `frontend/app/admin/dashboard/page.tsx` (lines 45–74)
- **Problem**: Shows `1,284` total users, `342` active sessions, `99.9%` system health — all fabricated.
- **Impact**: Misleading information
- **Fix**: Build `/api/admin/stats` and display real counts
- **TODO Phase**: Phase 3.4

### ISSUE-020: Landing Page Fabricated Stats
- **File**: `frontend/app/page.tsx`
- **Problem**: Claims `50k+` records processed, `99.9%` uptime SLA, `<2s` response time — none based on real data.
- **Impact**: False claims on marketing page
- **Fix**: Remove or label as "target metrics"
- **TODO Phase**: Phase 3.5

### ISSUE-021: Demo Credentials Exposed in Login UI
- **File**: `frontend/app/(auth)/login/page.tsx` (lines 258–267)
- **Problem**: Shows `admin@medintel.com / admin123` on the login page for the admin role.
- **Impact**: Security risk if deployed, unprofessional
- **Fix**: Remove the hint entirely, or hide behind a `NODE_ENV=development` check
- **TODO Phase**: Phase 1.1

### ISSUE-022: Footer Dead Links
- **File**: `frontend/components/ui/Footer.tsx` (lines 63–107)
- **Problem**: "Documentation", "API Reference", "Privacy Policy", "System Status", "Support", "Terms", "Privacy" are `<span>` tags styled as text — they look like links but do nothing.
- **Impact**: Broken UX, unprofessional feel
- **Fix**: Either link to real pages or remove them
- **TODO Phase**: Phase 3.5

### ISSUE-023: Backward-Compatibility Shim Files
- **Files**: `frontend/lib/auth.ts`, `frontend/lib/api.ts`
- **Problem**: These files only re-export symbols from `SessionProvider` and `api-client.ts`. They were created when switching from NextAuth to custom auth but are no longer needed.
- **Impact**: Unnecessary indirection
- **Fix**: Update all imports to use the real modules, delete the shims
- **TODO Phase**: Phase 1.3

### ISSUE-024: No Error Boundary or 404 Page
- **Problem**: No `app/error.tsx`, no `app/not-found.tsx`, no `app/loading.tsx`. Unhandled errors show the default Next.js error page.
- **Impact**: Poor user experience on errors
- **Fix**: Add custom error boundary with branded design, 404 page, and loading states
- **TODO Phase**: Phase 4.3

### ISSUE-025: No Tests at All
- **Problem**: Zero test files across the entire codebase — no unit tests, integration tests, or E2E tests.
- **Impact**: No regression safety net, poor capstone presentation
- **Fix**: Add pytest + httpx for backend, at minimum ensure `npm run build` passes
- **TODO Phase**: Phase 4

---

## Summary Matrix

| Severity | Count | Examples |
|----------|-------|---------|
| 🔴 Critical | 4 | Admin role guard, JWT secret, rate limiting, race condition |
| 🟠 High | 5 | Broken import, empty files, unused schemas, stale types |
| 🟡 Medium | 7 | onupdate bug, echo=True, type duplication, no .env.example |
| 🔵 Low | 9 | Hardcoded data, demo creds, dead links, no tests |
| **Total** | **25** | |
