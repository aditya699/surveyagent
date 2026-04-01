# core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    """
    Deep Technical Context:
    - Application-wide configuration loaded from environment variables via .env
    - Uses pydantic-settings for automatic validation and type coercion
    - The .env path resolves from this file's location: config.py -> core/ -> server/ -> project root
    - extra="ignore" allows unused .env keys (BLOB_KEY, AZURE_*, etc.) without errors
    """
    MONGO_URI: str
    MONGO_DB_NAME: str = "surveyagent"
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-5.4-mini"
    ANTHROPIC_API_KEY: str | None = None
    ANTHROPIC_MODEL: str = "claude-sonnet-4-6"
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL: str = "gemini-3.1-pro-preview"
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1 * 24 * 60  # 1 day in minutes
    JWT_REFRESH_TOKEN_EXPIRE_MINUTES: int = 14 * 24 * 60  # 14 days in minutes
    RESEND_API_KEY: str | None = None
    FRONTEND_URL: str = "http://localhost:5174"
    ENABLE_DOCS: bool = True  # Set to False in production
    MAX_SURVEYS_PER_USER: int = 0  # 0 = unlimited (default for self-hosted/dev)
    BYPASS_LIMIT_EMAILS: str = ""  # comma-separated emails that skip survey limits
    INTERVIEW_ABANDON_TIMEOUT_MINUTES: int = 120  # 2 hours; 0 = disabled

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent.parent / ".env",
        extra="ignore",
    )


settings = Settings()
