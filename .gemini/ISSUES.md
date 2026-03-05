# MedIntel — Known Issues & Technical Debt

> Comprehensive inventory of every issue found during code review.
> Each issue links to the TODO phase where it will be resolved.
>
> Last updated: 2026-03-06 (after Phase 3 completion)

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

### ~~ISSUE-004: Signup Race Condition (Duplicate Email)~~ ✅ RESOLVED
- **Fixed in**: Phase 2.1 — Added `IntegrityError` catch in `create_user()`. The `session.commit()` is now wrapped in try/except to handle concurrent duplicate email registrations gracefully.

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

### ~~ISSUE-010: `onupdate` Lambda Won't Fire with ORM Pattern~~ ✅ RESOLVED
- **Fixed in**: Phase 3 — Removed broken `onupdate` lambda from 4 models. Added SQLAlchemy `before_flush` event listener in `engine.py` that auto-sets `updated_at` on any dirty ORM instance.

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

### ~~ISSUE-017: All Doctors See Identical Appointments~~ ✅ RESOLVED
- **Fixed in**: Phase 3 — Doctor dashboard rewritten to fetch real data from `/api/appointments/upcoming` and `/api/mappings/my-patients`. Shows proper empty states.

### ~~ISSUE-018: All Patients See Identical Health Data~~ ✅ RESOLVED
- **Fixed in**: Phase 3 — Patient dashboard rewritten with live API calls for appointments, profile data, doctors. All hardcoded stats removed.

### ~~ISSUE-019: Admin Dashboard Fake System Stats~~ ✅ RESOLVED
- **Fixed in**: Phase 3 — Built `GET /api/admin/stats` endpoint (7 real DB counts). Admin dashboard now shows live platform statistics.

### ~~ISSUE-020: Landing Page Fabricated Stats~~ ✅ RESOLVED
- **Fixed in**: Phase 3 — Replaced fabricated stats (50k+ records, 99.9% uptime) with honest labels (3 User Roles, 25+ API Endpoints, RBAC, 256-bit Encryption).

### ~~ISSUE-021: Demo Credentials Exposed~~ ✅ RESOLVED
- **Fixed in**: Phase 1.1 — Removed `admin@medintel.com / admin123` from login page.

### ~~ISSUE-022: Footer Dead Links~~ ✅ RESOLVED
- **Fixed in**: Phase 3 — Removed all dead `<span>` tags (Documentation, API Reference, Privacy Policy, Terms, Support, System Status). Kept only working links.

### ~~ISSUE-023: Backward-Compat Shim Files~~ ✅ RESOLVED
- **Fixed in**: Phase 1.3 — Deleted `lib/auth.ts` and `lib/api.ts`.

### ~~ISSUE-024: No Error Boundary or 404 Page~~ ✅ RESOLVED
- **Fixed in**: Phase 1 — Added `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx`.

### ~~ISSUE-025: No Tests at All~~ ✅ RESOLVED
- **Fixed in**: Phase 2 — Added 30 tests across 3 test files (auth, profiles, appointments/mappings). Uses pytest + httpx + pytest-asyncio with NullPool for Windows compatibility.

### ISSUE-026: Next.js Middleware Deprecation ✅ RESOLVED
- **Fixed in**: Post Phase 1 — Renamed `middleware.ts` → `proxy.ts`, function `middleware()` → `proxy()`.

### ISSUE-027: sw.js 404 Spam ✅ RESOLVED
- **Fixed in**: Post Phase 1 — Added `public/sw.js` no-op stub.

---

## Summary Matrix

| Severity | Total | Resolved | Open |
|----------|-------|----------|------|
| 🔴 Critical | 4 | 3 | 1 (rate limiting) |
| 🟠 High | 5 | 5 | 0 |
| 🟡 Medium | 7 | 6 | 1 (CSRF) |
| 🔵 Low | 11 | 11 | 0 |
| **Total** | **27** | **25** | **2** |
