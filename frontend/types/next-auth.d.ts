/**
 * Auth type declarations for the cookie-based Hybrid BFF auth system.
 *
 * These types are used throughout the frontend to ensure type safety
 * for user sessions, roles, and auth-related payloads.
 *
 * This file replaces the previous NextAuth module augmentation.
 * Since we no longer use NextAuth, we define our own standalone types
 * that mirror the backend's Pydantic models (UserPublic, TokenResponse).
 */

// ---------------------------------------------------------------------------
//  Role enum (mirrors backend `UserRole` Python enum)
// ---------------------------------------------------------------------------

export type UserRole = "PATIENT" | "DOCTOR" | "ADMIN";

// ---------------------------------------------------------------------------
//  User (mirrors backend `UserPublic` Pydantic model)
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  image: string | null;
  auth_provider: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
//  Session (returned by the AuthProvider context)
// ---------------------------------------------------------------------------

export interface AuthSession {
  user: AuthUser;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

// ---------------------------------------------------------------------------
//  JWT payload (decoded from the access_token cookie — not verified client-side)
// ---------------------------------------------------------------------------

export interface JwtPayload {
  /** User UUID */
  sub: string;
  /** User email */
  email: string;
  /** User role (uppercase: PATIENT | DOCTOR | ADMIN) */
  role: UserRole;
  /** Issued-at timestamp (seconds since epoch) */
  iat: number;
  /** Expiration timestamp (seconds since epoch) */
  exp: number;
}

// ---------------------------------------------------------------------------
//  API response shapes (mirrors backend Pydantic schemas)
// ---------------------------------------------------------------------------

/** Matches backend `TokenResponse` — returned by FastAPI on signup/login. */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

/** Matches backend `UserPublic` — the safe response model (no passwords). */
export type UserPublic = AuthUser;

/** Standard error envelope returned by FastAPI and BFF routes. */
export interface ApiErrorResponse {
  error?: string;
  detail?: string;
}

// ---------------------------------------------------------------------------
//  BFF response shapes (returned by Next.js API routes to the browser)
// ---------------------------------------------------------------------------

export interface BffAuthSuccessResponse {
  message: string;
  user: AuthUser;
}

export interface BffErrorResponse {
  error: string;
}

export interface BffLogoutResponse {
  message: string;
}
