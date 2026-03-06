import { NextRequest, NextResponse } from "next/server";

/**
 * Catch-all API proxy route.
 *
 * Handles ALL /api/* requests that are NOT handled by the explicit
 * BFF routes (/api/auth/login, /api/auth/signup, /api/auth/me, /api/auth/logout).
 *
 * Why this exists:
 *   In production, the frontend (Vercel) and backend (Render) live on
 *   different domains. The HttpOnly `access_token` cookie is set on the
 *   Vercel domain, so the browser can't send it directly to Render.
 *
 *   This route reads the cookie from the incoming request and forwards
 *   it to the backend as a Bearer token in the Authorization header.
 *
 *   This runs at RUNTIME (not build-time like next.config.ts rewrites),
 *   so it always uses the correct backend URL.
 */

const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    process.env.BACKEND_URL ??
    "http://localhost:8000";

async function handler(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path } = await params;
    const backendPath = `/api/${path.join("/")}`;

    // Forward query string
    const url = new URL(request.url);
    const search = url.search;
    const backendUrl = `${BACKEND_URL}${backendPath}${search}`;

    // Read the HttpOnly cookie and convert to Bearer header
    const token = request.cookies.get("access_token")?.value;

    const headers: Record<string, string> = {
        "Content-Type": request.headers.get("Content-Type") ?? "application/json",
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    // Forward the request body for non-GET methods
    let body: string | null = null;
    if (request.method !== "GET" && request.method !== "HEAD") {
        try {
            body = await request.text();
        } catch {
            // No body
        }
    }

    try {
        const backendRes = await fetch(backendUrl, {
            method: request.method,
            headers,
            body,
        });

        const data = await backendRes.text();

        return new NextResponse(data, {
            status: backendRes.status,
            headers: {
                "Content-Type": backendRes.headers.get("Content-Type") ?? "application/json",
            },
        });
    } catch (error) {
        console.error(`[API Proxy] Error proxying ${request.method} ${backendPath}:`, error);
        return NextResponse.json(
            { error: "Unable to reach the backend server." },
            { status: 502 }
        );
    }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
