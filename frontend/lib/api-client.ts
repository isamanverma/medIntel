/**
 * Centralized API client for direct browser → FastAPI communication.
 *
 * This client is used by client components that need to fetch data
 * directly from the FastAPI backend (after authentication).  The
 * HttpOnly cookie (`access_token`) set by the Next.js BFF proxy is
 * automatically included on every request thanks to `credentials: "include"`.
 *
 * For auth operations (signup, login, logout) the browser always talks
 * to the Next.js BFF routes (`/api/auth/*`) — never directly to FastAPI.
 * Those BFF routes handle token extraction and cookie management.
 *
 * Architecture:
 *   Browser (data fetching)
 *     → api-client.ts (this file, credentials: "include")
 *       → FastAPI (reads the HttpOnly cookie / Bearer token)
 *
 *   Browser (auth operations)
 *     → /api/auth/* (Next.js BFF proxy)
 *       → lib/api-client.ts (server-side, no cookies needed — passes token explicitly)
 *         → FastAPI
 */

// ---------------------------------------------------------------------------
//  Backend base URL
// ---------------------------------------------------------------------------

const BACKEND_URL: string =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  process.env.BACKEND_URL ??
  "http://localhost:8000";

// ---------------------------------------------------------------------------
//  Shared TypeScript interfaces (mirror FastAPI Pydantic models)
// ---------------------------------------------------------------------------

export type UserRole = "PATIENT" | "DOCTOR" | "ADMIN";

/** Matches `UserPublic` on the backend. */
export interface UserPublic {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  image: string | null;
  auth_provider: string;
  created_at: string;
}

/** Matches `TokenResponse` on the backend. */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserPublic;
}

/** Shape of validation / business-logic errors returned by FastAPI. */
export interface ApiError {
  detail: string;
}

/** Signup request body — matches `UserCreate` on the backend. */
export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

/** Login request body — matches `LoginRequest` on the backend. */
export interface LoginRequest {
  email: string;
  password: string;
}

// ---------------------------------------------------------------------------
//  Custom error class
// ---------------------------------------------------------------------------

export class BackendError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(detail);
    this.name = "BackendError";
  }
}

// ---------------------------------------------------------------------------
//  Low-level fetch wrapper
// ---------------------------------------------------------------------------

/**
 * Generic request helper.
 *
 * - Automatically sets `Content-Type: application/json`.
 * - Includes credentials (cookies) on every request so the FastAPI
 *   backend can read the `access_token` HttpOnly cookie.
 * - Throws a typed `BackendError` for non-2xx responses.
 *
 * @param path   — URL path relative to the backend base (e.g. `/api/auth/me`)
 * @param options — standard `RequestInit` overrides
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BACKEND_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    credentials: "include", // ← sends the HttpOnly cookie automatically
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // Try to parse JSON regardless of status to capture `detail` field
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (!res.ok) {
    const detail =
      (body as ApiError | null)?.detail ??
      `Backend responded with ${res.status}`;
    throw new BackendError(res.status, detail);
  }

  return body as T;
}

// ---------------------------------------------------------------------------
//  Auth API — called from Next.js BFF routes (server-side)
//
//  These do NOT set `credentials: "include"` because they run on the
//  server where there is no cookie jar.  The BFF route extracts the
//  token from the FastAPI response and sets the HttpOnly cookie itself.
// ---------------------------------------------------------------------------

/**
 * Register a new user.  Returns a JWT token + public user profile.
 *
 * Called by: `app/api/auth/signup/route.ts` (BFF proxy, server-side)
 */
export async function signup(data: SignupRequest): Promise<TokenResponse> {
  return request<TokenResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Verify email + password.  Returns a JWT token + public user profile.
 *
 * Called by: `app/api/auth/login/route.ts` (BFF proxy, server-side)
 */
export async function login(data: LoginRequest): Promise<TokenResponse> {
  return request<TokenResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ---------------------------------------------------------------------------
//  Data API — called directly from the browser (client-side)
//
//  The `credentials: "include"` in the base `request()` function ensures
//  the HttpOnly `access_token` cookie is sent with every call.
// ---------------------------------------------------------------------------

/**
 * Fetch the currently-authenticated user's profile.
 *
 * Called by: client components that need session data.
 */
export async function getMe(): Promise<UserPublic> {
  return request<UserPublic>("/api/auth/me", {
    method: "GET",
  });
}
