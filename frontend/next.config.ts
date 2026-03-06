import type { NextConfig } from "next";

/**
 * Next.js Rewrite Proxy
 *
 * In production, the frontend (Vercel) and backend (Render) live on
 * different domains.  The HttpOnly cookie set by our BFF routes is
 * bound to the frontend origin, so direct fetch() calls to the
 * backend domain never include it → 401 Unauthorized.
 *
 * Solution: proxy all /api/* requests (except BFF routes /api/auth/*)
 * through Next.js rewrites.  The browser always talks to the same
 * domain, the cookie is included, and Next.js forwards the request
 * to the backend with the correct Authorization header.
 */
const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Proxy all /api/* paths EXCEPT /api/auth/* (handled by BFF routes)
      {
        source: "/api/profiles/:path*",
        destination: `${backendUrl}/api/profiles/:path*`,
      },
      {
        source: "/api/appointments/:path*",
        destination: `${backendUrl}/api/appointments/:path*`,
      },
      {
        source: "/api/mappings/:path*",
        destination: `${backendUrl}/api/mappings/:path*`,
      },
      {
        source: "/api/treatments/:path*",
        destination: `${backendUrl}/api/treatments/:path*`,
      },
      {
        source: "/api/reports/:path*",
        destination: `${backendUrl}/api/reports/:path*`,
      },
      {
        source: "/api/adherence/:path*",
        destination: `${backendUrl}/api/adherence/:path*`,
      },
      {
        source: "/api/admin/:path*",
        destination: `${backendUrl}/api/admin/:path*`,
      },
      {
        source: "/api/referrals/:path*",
        destination: `${backendUrl}/api/referrals/:path*`,
      },
      {
        source: "/api/care-teams/:path*",
        destination: `${backendUrl}/api/care-teams/:path*`,
      },
      {
        source: "/api/chat/:path*",
        destination: `${backendUrl}/api/chat/:path*`,
      },
      {
        source: "/api/health",
        destination: `${backendUrl}/api/health`,
      },
    ];
  },
};

export default nextConfig;
