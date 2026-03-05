/**
 * POST /api/auth/signup
 *
 * BFF (Backend-for-Frontend) proxy for user registration.
 *
 * This route is the ONLY place where the JWT token is handled on the
 * frontend side.  The browser never sees or stores the raw token.
 *
 * Flow:
 *   1. Browser submits signup form → this Next.js API route
 *   2. This route forwards the request to FastAPI `/api/auth/signup`
 *   3. FastAPI returns `{ access_token, token_type, user }` (TokenResponse)
 *   4. This route extracts `access_token`, sets it as an HttpOnly cookie
 *   5. Returns only the `user` (UserPublic) payload to the browser
 *
 * Security:
 *   - The JWT is stored in an HttpOnly, Secure, SameSite=Lax cookie
 *   - The browser cannot read or tamper with the token via JavaScript
 *   - Subsequent requests to FastAPI include the cookie automatically
 */

import { NextRequest, NextResponse } from "next/server";
import {
  signup,
  BackendError,
  type UserRole,
  type TokenResponse,
  type UserPublic,
} from "@/lib/api-client";

// ─── Types ───────────────────────────────────────────────────────

interface SignupBody {
  name: string;
  email: string;
  password: string;
  role: string;
}

// ─── Helpers ─────────────────────────────────────────────────────

const VALID_ROLES: UserRole[] = ["PATIENT", "DOCTOR", "ADMIN"];

function normalizeRole(raw: string): UserRole | null {
  const upper = raw.toUpperCase() as UserRole;
  return VALID_ROLES.includes(upper) ? upper : null;
}

/**
 * Determine whether the cookie should set `Secure` flag.
 * In development (HTTP) we must omit it; in production (HTTPS) we set it.
 */
function isSecureContext(): boolean {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return url.startsWith("https://");
}

/** Cookie max-age in seconds — matches the backend JWT expiry (default 30 min). */
const COOKIE_MAX_AGE_SECONDS = 60 * 30;

// ─── Route handler ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── Parse body ──────────────────────────────────────────────────
  let body: SignupBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, email, password, role: rawRole } = body;

  // ── Light validation (fail fast before hitting the network) ────
  if (!name || !email || !password || !rawRole) {
    return NextResponse.json(
      { error: "All fields are required (name, email, password, role)." },
      { status: 400 },
    );
  }

  const role = normalizeRole(rawRole);
  if (!role) {
    return NextResponse.json(
      { error: "Invalid role. Must be PATIENT, DOCTOR, or ADMIN." },
      { status: 400 },
    );
  }

  // ── Forward to FastAPI backend ─────────────────────────────────
  let result: TokenResponse;
  try {
    result = await signup({ name, email, password, role });
  } catch (error) {
    // Map known backend errors to appropriate HTTP responses
    if (error instanceof BackendError) {
      return NextResponse.json(
        { error: error.detail },
        { status: error.status },
      );
    }

    // Network failure or unexpected error
    console.error("[POST /api/auth/signup] Unexpected error:", error);
    return NextResponse.json(
      { error: "Unable to reach the server. Please try again later." },
      { status: 502 },
    );
  }

  // ── Build the public response (no token exposed to browser) ────
  const userPayload: UserPublic = result.user;

  const response = NextResponse.json(
    {
      message: "Account created successfully",
      user: userPayload,
    },
    { status: 201 },
  );

  // ── Set the JWT as an HttpOnly cookie ──────────────────────────
  //
  // - httpOnly:  JS cannot read it → prevents XSS token theft
  // - secure:    only sent over HTTPS (disabled in dev for localhost)
  // - sameSite:  "lax" protects against CSRF while allowing normal navigation
  // - path:      "/" so it's sent on every request to this origin
  // - maxAge:    matches the JWT expiry so the cookie auto-expires
  //
  response.cookies.set("access_token", result.access_token, {
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}
