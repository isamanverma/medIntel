/**
 * Backward-compatibility shim.
 *
 * The NextAuth-based auth system has been replaced by a custom
 * cookie-based Hybrid BFF architecture.  All session management
 * now lives in `@/components/providers/SessionProvider`.
 *
 * This file re-exports the key symbols so that any existing code
 * importing from `@/lib/auth` continues to work without changes.
 */

export {
  useAuth,
  type SessionUser,
  type UserRole,
} from "@/components/providers/SessionProvider";

/**
 * Map a role string (e.g. "DOCTOR") to its dashboard path.
 *
 * This was previously exported from the NextAuth config.  Keeping
 * it here so that any callers don't break.
 */
export function roleToDashboard(role: string): string {
  switch (role.toUpperCase()) {
    case "DOCTOR":
      return "/doctor/dashboard";
    case "ADMIN":
      return "/admin/dashboard";
    case "PATIENT":
    default:
      return "/patient/dashboard";
  }
}
