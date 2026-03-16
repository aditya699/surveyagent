# core/logging_config.py
import logging
import os
from typing import Optional


def setup_logging(app_name: str = "surveyagent", level: Optional[str] = None) -> None:
    """
    Deep Technical Context:
    - Configures application-wide logging with a console StreamHandler
    - Integrates with FastAPI/Uvicorn by not overriding existing handlers
    - Respects LOG_LEVEL environment variable (default INFO)
    - Quiets noisy third-party loggers to reduce log noise in production
    """
    # Determine log level
    env_level = (level or os.getenv("LOG_LEVEL", "INFO")).upper()
    log_level = getattr(logging, env_level, logging.INFO)

    root_logger = logging.getLogger()

    # If handlers already exist (e.g., when run under Uvicorn), only set level
    if root_logger.handlers:
        root_logger.setLevel(log_level)
        return

    # Otherwise configure a basic console handler
    formatter = logging.Formatter(
        fmt="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)

    root_logger.setLevel(log_level)
    root_logger.addHandler(console_handler)

    # Tweak noisy third-party loggers
    for noisy in ("azure", "botocore", "boto3", "motor", "httpx", "httpcore"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: Optional[str] = None) -> logging.Logger:
    """Return a module-specific logger, ensuring logging is set up."""
    setup_logging()
    return logging.getLogger(name or __name__)
