/**
 * POST /api/auth/login
 *
 * BFF (Backend-for-Frontend) proxy for user authentication.
 *
 * This route mirrors the signup BFF proxy pattern — it is the ONLY
 * place on the frontend where the raw JWT token is handled.
 *
 * Flow:
 *   1. Browser submits login form → this Next.js API route
 *   2. This route forwards credentials to FastAPI `/api/auth/login`
 *   3. FastAPI verifies the password and returns `{ access_token, token_type, user }`
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
  login,
  BackendError,
  type TokenResponse,
  type UserPublic,
} from "@/lib/api-client";

// ─── Types ───────────────────────────────────────────────────────

interface LoginBody {
  email: string;
  password: string;
  role?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Determine whether the cookie should set the `Secure` flag.
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
  let body: LoginBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { email, password, role } = body;

  // ── Light validation (fail fast before hitting the network) ────
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  // ── Forward to FastAPI backend ─────────────────────────────────
  let result: TokenResponse;
  try {
    result = await login({ email, password, role });
  } catch (error) {
    // Map known backend errors to appropriate HTTP responses
    if (error instanceof BackendError) {
      return NextResponse.json(
        { error: error.detail },
        { status: error.status },
      );
    }

    // Network failure or unexpected error
    console.error("[POST /api/auth/login] Unexpected error:", error);
    return NextResponse.json(
      { error: "Unable to reach the server. Please try again later." },
      { status: 502 },
    );
  }

  // ── Build the public response (no token exposed to browser) ────
  const userPayload: UserPublic = result.user;

  const response = NextResponse.json(
    {
      message: "Login successful",
      user: userPayload,
    },
    { status: 200 },
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
