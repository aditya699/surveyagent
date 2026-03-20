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
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1 * 24 * 60  # 1 day in minutes
    JWT_REFRESH_TOKEN_EXPIRE_MINUTES: int = 14 * 24 * 60  # 14 days in minutes
    ENABLE_DOCS: bool = True  # Set to False in production

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent.parent.parent / ".env",
        extra="ignore",
    )


settings = Settings()
