/**
 * POST /api/auth/logout
 *
 * BFF (Backend-for-Frontend) route for user logout.
 *
 * Since the JWT is stored in an HttpOnly cookie that JavaScript cannot
 * access, the only way to "log out" on the client side is to ask the
 * server to delete the cookie.  This route does exactly that.
 *
 * Flow:
 *   1. Browser sends POST to this Next.js API route
 *   2. This route responds with a `Set-Cookie` header that expires
 *      the `access_token` cookie immediately (maxAge: 0)
 *   3. The browser deletes the cookie on receipt
 *   4. Subsequent requests to FastAPI will no longer carry a token
 *
 * Security:
 *   - The cookie attributes (httpOnly, secure, sameSite, path) MUST
 *     match exactly what was set during login/signup — otherwise the
 *     browser will treat it as a different cookie and won't delete it.
 */

import { NextResponse } from "next/server";

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Determine whether the cookie should set the `Secure` flag.
 * Must match the flag used when the cookie was originally set.
 */
function isSecureContext(): boolean {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return url.startsWith("https://");
}

// ─── Route handler ───────────────────────────────────────────────

export async function POST() {
  const response = NextResponse.json(
    { message: "Logged out successfully" },
    { status: 200 },
  );

  // Delete the HttpOnly cookie by setting maxAge to 0.
  // All attributes must match the original Set-Cookie for the
  // browser to correctly identify and remove it.
  response.cookies.set("access_token", "", {
    httpOnly: true,
    secure: isSecureContext(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
