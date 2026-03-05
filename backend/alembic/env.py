"""
Alembic environment configuration.

Loads the DATABASE_URL from the .env file and wires up SQLModel metadata
so that `alembic revision --autogenerate` can detect all models.
"""

from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# ── Load environment variables BEFORE importing app modules ────────────
from dotenv import load_dotenv

load_dotenv()

# ── Import all models so SQLModel.metadata is fully populated ──────────
from sqlmodel import SQLModel
from app.models import (  # noqa: F401  – side-effect: registers tables
    User,
    PatientProfile,
    DoctorProfile,
    PatientDoctorMapping,
    Appointment,
    TreatmentPlan,
    Medication,
    MedicalReport,
    AdherenceLog,
    AgentInsight,
)

from app.core.config import settings

# ── Alembic Config object ─────────────────────────────────────────────
config = context.config

# Override sqlalchemy.url with the value from our Settings (sync driver).
config.set_main_option("sqlalchemy.url", settings.sync_database_url)

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# The MetaData object that Alembic will inspect for autogenerate.
target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    Configures the context with just a URL — no Engine needed.
    Calls to context.execute() emit the given SQL string to the script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    Creates an Engine and associates a connection with the context.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
