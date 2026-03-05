/**
 * Backward-compatibility shim.
 *
 * The API client has been refactored into `lib/api-client.ts` as part
 * of the Hybrid BFF architecture migration.  This module re-exports
 * every public symbol so that existing callers importing from
 * `@/lib/api` continue to work without changes.
 *
 * New code should import directly from `@/lib/api-client` instead.
 */

export {
  // ── Types ───────────────────────────────────────────────────────
  type UserRole,
  type UserPublic,
  type TokenResponse,
  type ApiError,
  type SignupRequest,
  type LoginRequest,

  // ── Error class ─────────────────────────────────────────────────
  BackendError,

  // ── API functions ───────────────────────────────────────────────
  signup,
  login,
  getMe,
} from "@/lib/api-client";
