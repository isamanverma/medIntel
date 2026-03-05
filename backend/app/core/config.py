import logging
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


_JWT_SECRET_DEFAULT = "medintel-jwt-secret-change-in-production"


class Settings:
    """Application settings loaded from environment variables."""

    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # ── JWT Configuration ──────────────────────────────────────────
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", _JWT_SECRET_DEFAULT)
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    # Access token lifetime in minutes (default: 30 minutes)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    )

    # ── Frontend origin (used by CORS and cookie domain logic) ─────
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")

    def __init__(self) -> None:
        if not self.DATABASE_URL:
            raise ValueError(
                "DATABASE_URL is not set in the environment.\n"
                "Please add your Supabase PostgreSQL connection string to .env.\n"
                "You can find it in your Supabase dashboard under:\n"
                "  Project Settings -> Database -> Connection string -> URI\n\n"
                'Example: DATABASE_URL="postgresql://postgres.[project-ref]:[password]'
                '@aws-0-[region].pooler.supabase.com:6543/postgres"'
            )

        if self.JWT_SECRET_KEY == _JWT_SECRET_DEFAULT:
            logger.warning(
                "JWT_SECRET_KEY is using the default value! "
                "Set a strong random secret in .env before deploying."
            )

    @property
    def async_database_url(self) -> str:
        """Convert the sync postgres URL to an async one for asyncpg."""
        if self.DATABASE_URL.startswith("postgresql://"):
            return self.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
        if self.DATABASE_URL.startswith("postgres://"):
            return self.DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
        return self.DATABASE_URL

    @property
    def sync_database_url(self) -> str:
        """Ensure the URL uses the sync psycopg2 driver (used by Alembic)."""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        # Strip any +asyncpg or +psycopg2 driver suffix so we get plain postgresql://
        for driver in ["+asyncpg", "+psycopg2"]:
            url = url.replace(driver, "")
        return url


settings = Settings()
