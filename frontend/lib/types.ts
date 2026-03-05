/**
 * Shared TypeScript types used across the frontend.
 *
 * This is the single source of truth for types that mirror the
 * backend's Pydantic models. Both `api-client.ts` and
 * `SessionProvider.tsx` import from here.
 */

// ── User & Auth ──────────────────────────────────────────────────

export type UserRole = "PATIENT" | "DOCTOR" | "ADMIN";

export interface UserPublic {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    image: string | null;
    auth_provider: string;
    created_at: string;
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
    user: UserPublic;
}

// ── API ──────────────────────────────────────────────────────────

export interface SignupRequest {
    name: string;
    email: string;
    password: string;
    role: UserRole;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface ApiError {
    detail: string;
}

// ── Session ──────────────────────────────────────────────────────

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthSession {
    user: UserPublic;
}

// ── Helpers ──────────────────────────────────────────────────────

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
