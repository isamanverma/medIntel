/**
 * Next.js Edge Proxy — cookie-based route protection.
 *
 * This replaces the previous NextAuth-based middleware.  Instead of
 * relying on a NextAuth session, we read the `access_token` HttpOnly
 * cookie (set by our BFF proxy routes) and decode its JWT payload to
 * extract the user's role.
 *
 * Why decode in middleware instead of calling FastAPI?
 *   - Middleware runs on the Edge Runtime for every matched request.
 *   - A network round-trip to FastAPI on every navigation would add
 *     unacceptable latency.
 *   - We only need the `role` claim to decide routing; full validation
 *     (signature, expiry, user-exists) happens when the browser actually
 *     fetches data from FastAPI.
 *
 * Security note:
 *   We do NOT verify the JWT signature here (Edge Runtime doesn't have
 *   access to Node.js crypto by default and importing jose adds bundle
 *   weight).  We only base64-decode the payload to read claims.  This is
 *   acceptable because:
 *     1. The cookie is HttpOnly — JS cannot forge it.
 *     2. The cookie is set by our own BFF routes from a verified FastAPI
 *        response.
 *     3. Actual data access is always gated by FastAPI which DOES verify
 *        the signature.
 *   The middleware is a UX convenience (redirects), not a security gate.
 *
 * Admin login is completely separated from the patient/doctor login:
 *   - /admin/login  → standalone admin-only portal
 *   - /login        → patient + doctor only (no admin tab)
 *   - /signup       → patient + doctor only (admin self-registration blocked)
 */

import { NextRequest, NextResponse } from "next/server";

// ─── Types ───────────────────────────────────────────────────────

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Decode the payload (middle segment) of a JWT without verifying the
 * signature.  Returns `null` if the token is malformed or the payload
 * cannot be parsed.
 */
function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Base64url → Base64 → decode
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Check whether the JWT has expired based on its `exp` claim.
 * Returns `true` if the token is expired or has no `exp`.
 */
function isTokenExpired(payload: JwtPayload): boolean {
  if (!payload.exp) return true;
  // exp is in seconds; Date.now() is in milliseconds
  return Date.now() >= payload.exp * 1000;
}

/**
 * Map a role string (e.g. "DOCTOR") to its dashboard path.
 */
function roleToDashboard(role: string): string {
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

/**
 * Map a role string to its login path.
 * Admins have their own isolated login page.
 */
function roleToLogin(role: string): string {
  switch (role.toUpperCase()) {
    case "ADMIN":
      return "/admin/login";
    case "DOCTOR":
      return "/login?role=doctor";
    case "PATIENT":
    default:
      return "/login?role=patient";
  }
}

// ─── Protected routes configuration ─────────────────────────────

const PROTECTED_ROUTES = [
  { path: "/doctor/dashboard", role: "DOCTOR" },
  { path: "/patient/dashboard", role: "PATIENT" },
  { path: "/admin/dashboard", role: "ADMIN" },
];

// ─── Auth pages (redirect away when already logged in) ───────────

/** Pages that a logged-in user should never see. */
const AUTH_PAGES = ["/login", "/signup", "/admin/login"];

// ─── Proxy ───────────────────────────────────────────────────────

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Read and decode the access_token cookie ────────────────────
  const token = request.cookies.get("access_token")?.value;

  let payload: JwtPayload | null = null;
  let isLoggedIn = false;

  if (token) {
    payload = decodeJwtPayload(token);
    if (payload && !isTokenExpired(payload)) {
      isLoggedIn = true;
    }
  }

  const userRole = payload?.role?.toUpperCase() ?? null;

  // ── Protected dashboard routes ─────────────────────────────────
  const matchedRoute = PROTECTED_ROUTES.find((route) =>
    pathname.startsWith(route.path),
  );

  if (matchedRoute) {
    if (!isLoggedIn) {
      // Not logged in → redirect to the role-appropriate login page,
      // preserving the intended destination as a callbackUrl.
      const loginPath = roleToLogin(matchedRoute.role);
      const loginUrl = new URL(loginPath, request.url);

      // Only set callbackUrl on non-admin routes to keep the admin
      // login page simple (it always goes to /admin/dashboard).
      if (matchedRoute.role !== "ADMIN") {
        loginUrl.searchParams.set("callbackUrl", pathname);
      }

      return NextResponse.redirect(loginUrl);
    }

    // Logged in but wrong role → redirect to the correct dashboard
    if (userRole && userRole !== matchedRoute.role) {
      const correctDashboard = new URL(roleToDashboard(userRole), request.url);
      return NextResponse.redirect(correctDashboard);
    }
  }

  // ── Auth pages — redirect away if already logged in ───────────
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p);

  if (isLoggedIn && isAuthPage) {
    if (userRole) {
      // An admin who somehow lands on /login or /signup should be sent
      // to their dashboard, not the patient/doctor login.
      const dashboard = new URL(roleToDashboard(userRole), request.url);
      return NextResponse.redirect(dashboard);
    }
  }

  // ── Extra guard: non-admins trying to access /admin/login ──────
  // If a patient or doctor is already logged in and visits /admin/login,
  // redirect them to their own dashboard instead.
  if (
    pathname === "/admin/login" &&
    isLoggedIn &&
    userRole &&
    userRole !== "ADMIN"
  ) {
    const dashboard = new URL(roleToDashboard(userRole), request.url);
    return NextResponse.redirect(dashboard);
  }

  return NextResponse.next();
}

// ─── Matcher — only run middleware on these paths ────────────────

export const config = {
  matcher: [
    "/doctor/dashboard/:path*",
    "/patient/dashboard/:path*",
    "/admin/dashboard/:path*",
    "/admin/login",
    "/login",
    "/signup",
  ],
};
