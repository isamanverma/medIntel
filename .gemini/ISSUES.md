# MedIntel — Known Issues & Technical Debt

> Comprehensive inventory of every issue found during code review.
> Each issue links to the TODO phase where it will be resolved.
>
> Last updated: 2026-03-05 (after Phase 1 completion)

---

## 🔴 Critical — Security & Correctness

### ~~ISSUE-001: Admin Dashboard Missing Role Guard~~ ✅ RESOLVED
- **Fixed in**: Phase 1.1 — Added role guard with `useEffect` redirect + render null check.

### ~~ISSUE-002: Hardcoded JWT Secret Default~~ ✅ RESOLVED
- **Fixed in**: Phase 1.2 — Startup now logs a loud warning if the default JWT secret is used.

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

### ~~ISSUE-005: Broken Import Shim~~ ✅ RESOLVED
- **Fixed in**: Phase 1.1 — Deleted `backend/app/auth.py`.

### ~~ISSUE-006: Empty Route Files~~ ✅ RESOLVED
- **Fixed in**: Phase 1.1 — Deleted entire `backend/app/routes/` directory.

### ~~ISSUE-007: Empty `deps.py`~~ ✅ RESOLVED
- **Fixed in**: Phase 1.1 — Deleted `backend/app/deps.py`. Will recreate with real content in Phase 2.

### ~~ISSUE-008: Unused `schemas.py`~~ ✅ RESOLVED
- **Fixed in**: Phase 1.1 — Deleted `backend/app/schemas.py`.

### ~~ISSUE-009: Stale `next-auth.d.ts`~~ ✅ RESOLVED
- **Fixed in**: Phase 1.1 — Deleted `frontend/types/next-auth.d.ts`. Also removed `next-auth` and `@auth/core` from `package.json`.

---

## 🟡 Medium — Best Practice Violations

### ISSUE-010: `onupdate` Lambda Won't Fire with ORM Pattern
- **File**: `backend/app/models/user.py` (line 152)
- **Problem**: `onupdate=lambda: datetime.now(timezone.utc)` on `updated_at` won't fire with the ORM pattern (`session.add()` + `session.commit()`).
- **Impact**: `updated_at` column never auto-updates
- **Fix**: Use `@event.listens_for(Session, "before_flush")` or set `updated_at` explicitly in services
- **TODO Phase**: Phase 2

### ~~ISSUE-011: SQL `echo=True` Left On~~ ✅ RESOLVED
- **Fixed in**: Phase 1.2 — Now reads `SQL_ECHO` env var, defaults to `false`.

### ~~ISSUE-012: Mixed Folder Conventions~~ ✅ RESOLVED
- **Fixed in**: Phase 1.1 — Deleted `routes/` directory, standardized on `api/`.

### ~~ISSUE-013: Frontend Type Duplication~~ ✅ RESOLVED
- **Fixed in**: Phase 1.3 — Created shared `lib/types.ts`, updated all imports.

### ~~ISSUE-014: Duplicate Schema Definitions in Backend~~ ✅ RESOLVED
- **Fixed in**: Phase 1.3 — Deleted `schemas.py`, kept inline schemas in source files.

### ~~ISSUE-015: No `.env.example` File~~ ✅ RESOLVED
- **Fixed in**: Phase 1.2 — Created `.env.example` for both backend and frontend.

### ISSUE-016: No CSRF Protection Beyond SameSite
- **Problem**: Auth BFF routes use `SameSite=Lax` cookies, which prevents CSRF on top-level navigations but not on programmatic `fetch()` calls from injected third-party scripts.
- **Impact**: Potential CSRF on state-changing POST endpoints
- **Fix**: Add a CSRF token or double-submit cookie pattern for state-changing operations
- **TODO Phase**: Phase 4

---

## 🔵 Low — Hardcoded Data & Cosmetic Issues

### ISSUE-017: All Doctors See Identical Appointments
- **File**: `frontend/app/doctor/dashboard/page.tsx`
- **Problem**: Hardcoded static array of 5 fake patients. Every doctor sees the same schedule.
- **Fix**: Replace with API call to `/api/appointments/upcoming`
- **TODO Phase**: Phase 3.3

### ISSUE-018: All Patients See Identical Health Data
- **File**: `frontend/app/patient/dashboard/page.tsx`
- **Problem**: Hardcoded stats, fake recent activity with stale dates.
- **Fix**: Replace with real API data or empty states
- **TODO Phase**: Phase 3.2

### ISSUE-019: Admin Dashboard Fake System Stats
- **File**: `frontend/app/admin/dashboard/page.tsx`
- **Problem**: Shows fabricated stats (1,284 users, 342 sessions, etc.)
- **Fix**: Build `/api/admin/stats` and display real counts
- **TODO Phase**: Phase 3.4

### ISSUE-020: Landing Page Fabricated Stats
- **File**: `frontend/app/page.tsx`
- **Problem**: Claims `50k+` records, `99.9%` uptime — none based on real data.
- **Fix**: Remove or label as target metrics
- **TODO Phase**: Phase 3.5

### ~~ISSUE-021: Demo Credentials Exposed~~ ✅ RESOLVED
- **Fixed in**: Phase 1.1 — Removed `admin@medintel.com / admin123` from login page.

### ISSUE-022: Footer Dead Links
- **File**: `frontend/components/ui/Footer.tsx`
- **Problem**: Multiple `<span>` tags styled as text but do nothing.
- **Fix**: Either link to real pages or remove them
- **TODO Phase**: Phase 3.5

### ~~ISSUE-023: Backward-Compat Shim Files~~ ✅ RESOLVED
- **Fixed in**: Phase 1.3 — Deleted `lib/auth.ts` and `lib/api.ts`.

### ~~ISSUE-024: No Error Boundary or 404 Page~~ ✅ RESOLVED
- **Fixed in**: Phase 1 — Added `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx`.

### ISSUE-025: No Tests at All
- **Problem**: Zero test files across the entire codebase.
- **Fix**: Add pytest + httpx for backend, ensure `npm run build` passes
- **TODO Phase**: Phase 4

### ISSUE-026: Next.js Middleware Deprecation ✅ RESOLVED
- **Fixed in**: Post Phase 1 — Renamed `middleware.ts` → `proxy.ts`, function `middleware()` → `proxy()`.

### ISSUE-027: sw.js 404 Spam ✅ RESOLVED
- **Fixed in**: Post Phase 1 — Added `public/sw.js` no-op stub.

---

## Summary Matrix

| Severity | Total | Resolved | Open |
|----------|-------|----------|------|
| 🔴 Critical | 4 | 2 | 2 (rate limiting, race condition) |
| 🟠 High | 5 | 5 | 0 |
| 🟡 Medium | 7 | 5 | 2 (onupdate bug, CSRF) |
| 🔵 Low | 11 | 5 | 6 (hardcoded data, dead links, no tests) |
| **Total** | **27** | **17** | **10** |
