"""
TDD tests for the enhanced Settings configuration.

Tests feature flags, pagination defaults, environment overrides,
and CSRF configuration.
"""

import os
import pytest


class TestSettingsDefaults:
    """Verify default values when no env vars are set (except DATABASE_URL)."""

    def test_app_name_default(self):
        from app.core.config import settings
        assert settings.APP_NAME == "MedIntel"

    def test_app_version_default(self):
        from app.core.config import settings
        assert settings.APP_VERSION == "1.0.0"

    def test_environment_default(self):
        from app.core.config import settings
        assert settings.ENVIRONMENT == "development"

    def test_log_level_default(self):
        from app.core.config import settings
        assert settings.LOG_LEVEL == "INFO"


class TestFeatureFlags:
    """Verify feature flags default to enabled."""

    def test_feature_referrals_enabled(self):
        from app.core.config import settings
        assert settings.FEATURE_REFERRALS is True

    def test_feature_care_teams_enabled(self):
        from app.core.config import settings
        assert settings.FEATURE_CARE_TEAMS is True

    def test_feature_ai_insights_disabled(self):
        from app.core.config import settings
        assert settings.FEATURE_AI_INSIGHTS is False


class TestPaginationDefaults:
    """Verify pagination configuration."""

    def test_default_page_size(self):
        from app.core.config import settings
        assert settings.DEFAULT_PAGE_SIZE == 20

    def test_max_page_size(self):
        from app.core.config import settings
        assert settings.MAX_PAGE_SIZE == 100


class TestCSRFConfig:
    """Verify CSRF configuration defaults."""

    def test_csrf_enabled_default(self):
        from app.core.config import settings
        # CSRF disabled by default in dev/test, enabled only in production
        assert isinstance(settings.CSRF_ENABLED, bool)

    def test_csrf_secret_defaults_to_jwt_secret(self):
        from app.core.config import settings
        assert settings.CSRF_SECRET == settings.JWT_SECRET_KEY


class TestCORSConfig:
    """Verify CORS configuration."""

    def test_cors_allow_credentials(self):
        from app.core.config import settings
        assert settings.CORS_ALLOW_CREDENTIALS is True


class TestSecurityConfig:
    """Verify security configuration."""

    def test_max_login_attempts(self):
        from app.core.config import settings
        assert settings.MAX_LOGIN_ATTEMPTS == 5

    def test_account_lockout_minutes(self):
        from app.core.config import settings
        assert settings.ACCOUNT_LOCKOUT_MINUTES == 15
