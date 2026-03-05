"""
Backward-compatibility shim.

All auth service logic now lives in ``app.services.auth_service``.
This package __init__ re-exports the public symbols so that existing
callers (old route files, tests, etc.) using ``from app.services import …``
continue to work without changes.
"""

from app.services.auth_service import (  # noqa: F401
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    get_user_by_email,
    get_user_by_id,
    create_user,
    verify_credentials,
    get_current_user,
    EmailAlreadyExistsError,
    InvalidCredentialsError,
    InvalidTokenError,
)

__all__ = [
    "hash_password",
    "verify_password",
    "create_access_token",
    "decode_access_token",
    "get_user_by_email",
    "get_user_by_id",
    "create_user",
    "verify_credentials",
    "get_current_user",
    "EmailAlreadyExistsError",
    "InvalidCredentialsError",
    "InvalidTokenError",
]
