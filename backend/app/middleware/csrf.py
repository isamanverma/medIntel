"""
CSRF protection middleware using double-submit cookie pattern.

When enabled (settings.CSRF_ENABLED), this middleware:
1. Sets a `csrf_token` non-HttpOnly cookie on every response
2. Verifies that state-changing requests (POST, PUT, PATCH, DELETE)
   include an `X-CSRF-Token` header matching the cookie value

Safe methods (GET, HEAD, OPTIONS) are always allowed through.
Auth endpoints (/api/auth/signup, /api/auth/login) are exempt
since they establish the session.
"""

import hashlib
import hmac
import secrets
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings

# Endpoints exempt from CSRF checks (session-establishing)
CSRF_EXEMPT_PATHS = {
    "/api/auth/signup",
    "/api/auth/login",
    "/docs",
    "/openapi.json",
    "/redoc",
}

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def _generate_csrf_token() -> str:
    """Generate a cryptographically secure CSRF token."""
    raw = secrets.token_urlsafe(32)
    # HMAC with the CSRF secret so tokens are bound to this server
    return hmac.new(
        settings.CSRF_SECRET.encode(),
        raw.encode(),
        hashlib.sha256,
    ).hexdigest()


class CSRFMiddleware(BaseHTTPMiddleware):
    """Double-submit cookie CSRF protection."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip if CSRF is disabled (dev/test mode)
        if not settings.CSRF_ENABLED:
            return await call_next(request)

        # Safe methods are always allowed
        if request.method in SAFE_METHODS:
            response = await call_next(request)
            # Ensure CSRF cookie exists on safe responses
            if "csrf_token" not in request.cookies:
                token = _generate_csrf_token()
                response.set_cookie(
                    key="csrf_token",
                    value=token,
                    httponly=False,  # JS must read this
                    samesite="lax",
                    secure=settings.ENVIRONMENT == "production",
                    path="/",
                    max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                )
            return response

        # Exempt paths
        if request.url.path in CSRF_EXEMPT_PATHS:
            response = await call_next(request)
            # Set CSRF cookie on login/signup responses
            token = _generate_csrf_token()
            response.set_cookie(
                key="csrf_token",
                value=token,
                httponly=False,
                samesite="lax",
                secure=settings.ENVIRONMENT == "production",
                path="/",
                max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            )
            return response

        # State-changing request: verify CSRF token
        cookie_token = request.cookies.get("csrf_token")
        header_token = request.headers.get("x-csrf-token")

        if not cookie_token or not header_token:
            return Response(
                content='{"detail":"CSRF token missing"}',
                status_code=403,
                media_type="application/json",
            )

        if not hmac.compare_digest(cookie_token, header_token):
            return Response(
                content='{"detail":"CSRF token mismatch"}',
                status_code=403,
                media_type="application/json",
            )

        return await call_next(request)
