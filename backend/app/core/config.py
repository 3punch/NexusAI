"""Application configuration.

All configuration is centralized here and loaded from environment variables
(12-factor style). No other module may read ``os.environ`` directly — that
rule keeps configuration testable and makes every setting discoverable in
exactly one file.

Layer position: ``core`` is imported by every other layer and imports none
of them. It is the innermost ring of the backend.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        env_prefix="NEXUSAI_",  # every env var is NEXUSAI_* — see /.env.example
    )

    app_name: str = "NexusAI"
    environment: str = "development"  # development | test | production

    # Auth / JWT
    secret_key: str = "dev-only-secret-change-me"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # Database (SQLite in dev; PostgreSQL in production)
    database_url: str = "sqlite:///./nexusai.db"

    # AI integration layer ("mock" needs no external service; "openai" is
    # only used when LLM_PROVIDER=openai AND a key is configured)
    llm_provider: str = "mock"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # CORS (only relevant when the SPA is served from a different origin)
    cors_origins: list[str] = []


@lru_cache
def get_settings() -> Settings:
    """Cached accessor so every caller shares one Settings instance."""
    return Settings()
