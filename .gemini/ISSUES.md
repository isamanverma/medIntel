# MedIntel — Known Issues & Technical Debt

> Comprehensive inventory of every issue found during code review.
> Each issue links to the TODO phase where it will be resolved.
>
> Last updated: 2026-03-06 (after Phase 4-5 completion)

---

## 🔴 Critical — Security & Correctness

### ~~ISSUE-001: Admin Dashboard Missing Role Guard~~ ✅ RESOLVED
- **Fixed in**: Phase 1.1 — Added role guard with `useEffect` redirect + render null check.

### ~~ISSUE-002: Hardcoded JWT Secret Default~~ ✅ RESOLVED
- **Fixed in**: Phase 1.2 — Startup now logs a loud warning if the default JWT secret is used.

### ~~ISSUE-003: No Rate Limiting on Auth Endpoints~~ ✅ RESOLVED
- **Fixed in**: Phase 4 — Added `slowapi` rate limiter: signup 3/min, login 5/min per IP. Returns `429 Too Many Requests`. Disabled in test mode via `TESTING` env var.

### ~~ISSUE-004: Signup Race Condition (Duplicate Email)~~ ✅ RESOLVED
- **Fixed in**: Phase 2.1 — Added `IntegrityError` catch in `create_user()`.

---

## 🟠 High — Broken Code & Dead Files

### ~~ISSUE-005: Broken Import Shim~~ ✅ RESOLVED
- **Fixed in**: Phase 1.1 — Deleted `backend/app/auth.py`.

### ~~ISSUE-006: Empty Route Files~~ ✅ RESOLVED
- **Fixed in**: Phase 1.1 — Deleted entire `backend/app/routes/` directory.

### ~~ISSUE-007: Empty `deps.py`~~ ✅ RESOLVED
- **Fixed in**: Phase 1.1 — Deleted `backend/app/deps.py`. Recreated with real content in Phase 2.

### ~~ISSUE-008: Unused `schemas.py`~~ ✅ RESOLVED
- **Fixed in**: Phase 1.1 — Deleted `backend/app/schemas.py`.

### ~~ISSUE-009: Stale `next-auth.d.ts`~~ ✅ RESOLVED
- **Fixed in**: Phase 1.1 — Deleted `frontend/types/next-auth.d.ts`. Also removed `next-auth` and `@auth/core` from `package.json`.

---

## 🟡 Medium — Best Practice Violations

### ~~ISSUE-010: `onupdate` Lambda Won't Fire with ORM Pattern~~ ✅ RESOLVED
- **Fixed in**: Phase 3 — Removed broken `onupdate` lambda from 4 models. Added SQLAlchemy `before_flush` event listener in `engine.py`.

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

### ~~ISSUE-016: No CSRF Protection Beyond SameSite~~ ✅ RESOLVED
- **Fixed in**: Phase 5 — Implemented double-submit cookie CSRF middleware (`app/middleware/csrf.py`). Disabled by default (`CSRF_ENABLED=false`), configurable per environment.
- **TODO Phase**: Phase 5 (security polish)

---

## 🔵 Low — Hardcoded Data & Cosmetic Issues

### ~~ISSUE-017: All Doctors See Identical Appointments~~ ✅ RESOLVED
- **Fixed in**: Phase 3 — Doctor dashboard rewritten to fetch real data.

### ~~ISSUE-018: All Patients See Identical Health Data~~ ✅ RESOLVED
- **Fixed in**: Phase 3 — Patient dashboard rewritten with live API calls.

### ~~ISSUE-019: Admin Dashboard Fake System Stats~~ ✅ RESOLVED
- **Fixed in**: Phase 3 — Built `GET /api/admin/stats` endpoint (7 real DB counts).

### ~~ISSUE-020: Landing Page Fabricated Stats~~ ✅ RESOLVED
- **Fixed in**: Phase 3 — Replaced fabricated stats with honest labels.

### ~~ISSUE-021: Demo Credentials Exposed~~ ✅ RESOLVED
- **Fixed in**: Phase 1.1 — Removed `admin@medintel.com / admin123` from login page.

### ~~ISSUE-022: Footer Dead Links~~ ✅ RESOLVED
- **Fixed in**: Phase 3 — Removed all dead `<span>` tags. Kept only working links.

### ~~ISSUE-023: Backward-Compat Shim Files~~ ✅ RESOLVED
- **Fixed in**: Phase 1.3 — Deleted `lib/auth.ts` and `lib/api.ts`.

### ~~ISSUE-024: No Error Boundary or 404 Page~~ ✅ RESOLVED
- **Fixed in**: Phase 1 — Added `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx`.

### ~~ISSUE-025: No Tests at All~~ ✅ RESOLVED
- **Fixed in**: Phase 2 — Added 35 tests across 4 test files.

### ISSUE-026: Next.js Middleware Deprecation ✅ RESOLVED
- **Fixed in**: Post Phase 1 — Renamed `middleware.ts` → `proxy.ts`.

### ISSUE-027: sw.js 404 Spam ✅ RESOLVED
- **Fixed in**: Post Phase 1 — Added `public/sw.js` no-op stub.

---

## Summary Matrix

| Severity | Total | Resolved | Open |
|----------|-------|----------|------|
| 🔴 Critical | 4 | 4 | 0 |
| 🟠 High | 5 | 5 | 0 |
| 🟡 Medium | 7 | 7 | 0 |
| 🔵 Low | 11 | 11 | 0 |
| **Total** | **27** | **27** | **0** |
