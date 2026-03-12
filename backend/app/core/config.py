import logging
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


_JWT_SECRET_DEFAULT = "medintel-jwt-secret-change-in-production"


def _bool_env(key: str, default: str = "false") -> bool:
    """Parse a boolean from an environment variable."""
    return os.getenv(key, default).lower() in ("1", "true", "yes")


class Settings:
    """Application settings loaded from environment variables.

    All values have sensible defaults for local development.
    Override via environment variables or a `.env` file.
    """

    # ── Application Metadata ──────────────────────────────────────
    APP_NAME: str = os.getenv("APP_NAME", "MedIntel")
    APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")  # development | staging | production
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO").upper()

    # ── Database ──────────────────────────────────────────────────
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_STORAGE_BUCKET: str = os.getenv("SUPABASE_STORAGE_BUCKET", "medical-reports")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # ── JWT Configuration ─────────────────────────────────────────
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", _JWT_SECRET_DEFAULT)
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
    )

    # ── Frontend origin (CORS & cookie domain) ────────────────────
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    CORS_ALLOW_CREDENTIALS: bool = _bool_env("CORS_ALLOW_CREDENTIALS", "true")

    # ── Rate Limiting / Testing ───────────────────────────────────
    TESTING: bool = _bool_env("TESTING")
    RATE_LIMIT_ENABLED: bool = not _bool_env("RATE_LIMIT_DISABLED")

    # ── CSRF Protection ──────────────────────────────────────────
    CSRF_ENABLED: bool = _bool_env("CSRF_ENABLED")
    CSRF_SECRET: str = os.getenv("CSRF_SECRET", os.getenv("JWT_SECRET_KEY", _JWT_SECRET_DEFAULT))

    # ── Security Config ──────────────────────────────────────────
    MAX_LOGIN_ATTEMPTS: int = int(os.getenv("MAX_LOGIN_ATTEMPTS", "5"))
    ACCOUNT_LOCKOUT_MINUTES: int = int(os.getenv("ACCOUNT_LOCKOUT_MINUTES", "15"))

    # ── Pagination ───────────────────────────────────────────────
    DEFAULT_PAGE_SIZE: int = int(os.getenv("DEFAULT_PAGE_SIZE", "20"))
    MAX_PAGE_SIZE: int = int(os.getenv("MAX_PAGE_SIZE", "100"))

    # ── Feature Flags ────────────────────────────────────────────
    FEATURE_REFERRALS: bool = _bool_env("FEATURE_REFERRALS", "true")
    FEATURE_CARE_TEAMS: bool = _bool_env("FEATURE_CARE_TEAMS", "true")
    FEATURE_AI_INSIGHTS: bool = _bool_env("FEATURE_AI_INSIGHTS", "false")

    # ── AI / LLM ─────────────────────────────────────────────────
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # PageIndex API key (preferred for native PageIndex tree generation)
    PAGEINDEX_API_KEY: str = os.getenv("PAGEINDEX_API_KEY", "")

    # OpenRouter (used by PageIndex for document tree building)
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o")

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

        if self.ENVIRONMENT == "production" and not self.CSRF_ENABLED:
            logger.warning(
                "CSRF protection is disabled in production! "
                "Set CSRF_ENABLED=true in .env for production deployments."
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
        for driver in ["+asyncpg", "+psycopg2"]:
            url = url.replace(driver, "")
        return url


settings = Settings()
