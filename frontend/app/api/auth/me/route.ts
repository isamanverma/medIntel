/**
 * GET /api/auth/me
 *
 * BFF (Backend-for-Frontend) proxy for fetching the current user's profile.
 *
 * This route reads the `access_token` HttpOnly cookie from the incoming
 * request, forwards it to the FastAPI `/api/auth/me` endpoint as a
 * Bearer token, and returns the user profile to the browser.
 *
 * Why this exists:
 *   - The `access_token` cookie is HttpOnly, so client-side JavaScript
 *     cannot read it directly.
 *   - For browser-initiated requests that go directly to FastAPI (via
 *     `api-client.ts` with `credentials: "include"`), the cookie is
 *     sent automatically and FastAPI reads it from `request.cookies`.
 *   - This route exists as a convenience for Next.js middleware and
 *     server components that need to verify / read the session without
 *     making a cross-origin request.
 *
 * Flow:
 *   1. Browser / middleware sends GET to this Next.js API route
 *   2. This route extracts the `access_token` cookie
 *   3. Forwards it to FastAPI as `Authorization: Bearer <token>`
 *   4. Returns the UserPublic payload (or 401 if invalid/missing)
 */

import { NextRequest, NextResponse } from "next/server";

// ─── Constants ───────────────────────────────────────────────────

const BACKEND_URL: string =
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  process.env.BACKEND_URL ??
  "http://localhost:8000";

// ─── Route handler ───────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // ── Extract the HttpOnly cookie ────────────────────────────────
  const token = request.cookies.get("access_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // ── Forward to FastAPI ─────────────────────────────────────────
  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      // No `credentials: "include"` here — we're on the server side
      // and explicitly passing the token via the Authorization header.
    });

    // Try to parse the JSON body regardless of status
    let body: unknown;
    try {
      body = await backendRes.json();
    } catch {
      body = null;
    }

    if (!backendRes.ok) {
      const detail =
        (body as { detail?: string } | null)?.detail ?? "Authentication failed";

      return NextResponse.json(
        { error: detail },
        { status: backendRes.status },
      );
    }

    // Return the UserPublic payload as-is
    return NextResponse.json(body, { status: 200 });
  } catch (error) {
    console.error("[GET /api/auth/me] Unexpected error:", error);
    return NextResponse.json(
      { error: "Unable to reach the server. Please try again later." },
      { status: 502 },
    );
  }
}
