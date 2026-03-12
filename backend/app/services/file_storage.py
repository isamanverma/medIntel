"""
File Storage Service — Supabase Storage upload handling.

Stores uploaded files in a Supabase Storage bucket under
reports/{patient_id}/ with a UUID-prefixed filename.
"""

from __future__ import annotations

import asyncio
import os
import urllib.error
import urllib.parse
import urllib.request
import uuid

from fastapi import UploadFile

from app.core.config import settings

# Maximum file size: 25 MB
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

# Allowed MIME types
ALLOWED_MIME_TYPES: frozenset[str] = frozenset(
    [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/tiff",
        "application/msword",  # .doc
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
    ]
)


class FileTooLargeError(Exception):
    pass


class InvalidFileTypeError(Exception):
    pass


class StorageUnavailableError(Exception):
    pass


def _storage_key() -> str:
    # Prefer service-role key; fallback to SUPABASE_KEY for compatibility.
    return settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY


def _storage_headers(content_type: str | None = None) -> dict[str, str]:
    key = _storage_key()
    if not settings.SUPABASE_URL or not key:
        raise StorageUnavailableError(
            "Supabase Storage is not configured. Set SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY)."
        )

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def _upload_to_supabase_sync(object_path: str, content: bytes, content_type: str) -> None:
    bucket = settings.SUPABASE_STORAGE_BUCKET
    base = settings.SUPABASE_URL.rstrip("/")
    encoded_path = urllib.parse.quote(object_path, safe="/")
    url = f"{base}/storage/v1/object/{bucket}/{encoded_path}"

    headers = _storage_headers(content_type)
    headers["x-upsert"] = "false"
    req = urllib.request.Request(
        url,
        data=content,
        method="POST",
        headers=headers,
    )
    try:
        with urllib.request.urlopen(req, timeout=60):
            return
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        if '"Bucket not found"' in body:
            raise StorageUnavailableError(
                "Supabase bucket not found. Create the configured bucket "
                f"'{bucket}' before uploading reports."
            ) from exc
        raise StorageUnavailableError(
            f"Supabase upload failed with status {exc.code}: {body}"
        ) from exc


def _parse_supabase_url(file_url: str) -> tuple[str, str]:
    if not file_url.startswith("supabase://"):
        raise FileNotFoundError(f"Not a Supabase storage URL: {file_url}")

    stripped = file_url[len("supabase://") :]
    if "/" not in stripped:
        raise FileNotFoundError(f"Invalid Supabase storage URL: {file_url}")
    bucket, object_path = stripped.split("/", 1)
    if not bucket or not object_path:
        raise FileNotFoundError(f"Invalid Supabase storage URL: {file_url}")
    return bucket, object_path


def _download_from_supabase_sync(file_url: str) -> bytes:
    bucket, object_path = _parse_supabase_url(file_url)
    base = settings.SUPABASE_URL.rstrip("/")
    encoded_path = urllib.parse.quote(object_path, safe="/")
    url = f"{base}/storage/v1/object/{bucket}/{encoded_path}"

    req = urllib.request.Request(url, method="GET", headers=_storage_headers())
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.read()
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            raise FileNotFoundError(f"Stored file not found: {file_url}") from exc
        body = exc.read().decode("utf-8", errors="ignore")
        raise StorageUnavailableError(
            f"Supabase download failed with status {exc.code}: {body}"
        ) from exc


def _delete_from_supabase_sync(file_url: str) -> None:
    try:
        bucket, object_path = _parse_supabase_url(file_url)
    except FileNotFoundError:
        return

    base = settings.SUPABASE_URL.rstrip("/")
    encoded_path = urllib.parse.quote(object_path, safe="/")
    url = f"{base}/storage/v1/object/{bucket}/{encoded_path}"
    req = urllib.request.Request(url, method="DELETE", headers=_storage_headers())
    try:
        with urllib.request.urlopen(req, timeout=30):
            return
    except Exception:
        # Best-effort delete; do not propagate.
        return


async def save_upload(
    file: UploadFile,
    patient_id: uuid.UUID,
) -> tuple[str, str, str]:
    """
    Save an uploaded file to Supabase Storage.

    Args:
        file:       The FastAPI UploadFile object.
        patient_id: The patient's profile UUID (used as sub-directory).

    Returns:
        (file_url, file_name, file_type) tuple where file_url follows
        supabase://{bucket}/{object_path}.

    Raises:
        InvalidFileTypeError: If the MIME type is not allowed.
        FileTooLargeError:    If the file exceeds MAX_FILE_SIZE_BYTES.
    """
    content_type = (file.content_type or "application/octet-stream").lower()
    if content_type not in ALLOWED_MIME_TYPES:
        raise InvalidFileTypeError(
            f"File type '{content_type}' is not allowed. "
            f"Accepted types: PDF, images (JPEG/PNG/WebP/GIF/TIFF), DOCX/DOC."
        )

    # Read file content
    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise FileTooLargeError(
            f"File size {len(content) / 1024 / 1024:.1f} MB exceeds the 25 MB limit."
        )

    # Generate unique filename to prevent overwrites
    original_name = file.filename or "upload"
    safe_name = os.path.basename(original_name)  # strip path traversal
    unique_filename = f"{uuid.uuid4().hex}_{safe_name}"

    object_path = f"reports/{patient_id}/{unique_filename}"
    await asyncio.to_thread(_upload_to_supabase_sync, object_path, content, content_type)

    file_url = f"supabase://{settings.SUPABASE_STORAGE_BUCKET}/{object_path}"
    return file_url, original_name, content_type


def read_file_bytes(file_url: str) -> bytes:
    """
    Read raw bytes from a stored file.

    Args:
        file_url: Supabase storage URL returned by save_upload().

    Returns:
        Raw file bytes.

    Raises:
        FileNotFoundError: If the file does not exist.
    """
    return _download_from_supabase_sync(file_url)


def delete_file(file_url: str) -> None:
    """Delete a stored file from Supabase Storage (best-effort)."""
    _delete_from_supabase_sync(file_url)
