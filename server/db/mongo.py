# db/mongo.py
import traceback
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from server.core.config import settings
from server.core.logging_config import get_logger

logger = get_logger(__name__)

# Module-level singleton for database connection
_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def get_db() -> AsyncIOMotorDatabase:
    """
    Deep Technical Context:
    - Returns a singleton Motor async database instance
    - Initializes the Motor client on first call using MONGO_URI from settings
    - Database name comes from MONGO_DB_NAME setting
    - Keeps one client alive for the application lifecycle
    - Motor handles connection pooling internally
    """
    global _client, _db
    if _db is None:
        _client = AsyncIOMotorClient(settings.MONGO_URI)
        _db = _client[settings.MONGO_DB_NAME]
        logger.info(f"MongoDB connection initialized - database: {settings.MONGO_DB_NAME}")
    return _db


async def log_error(
    error: Exception,
    location: str,
    additional_info: dict = None,
) -> None:
    """
    Deep Technical Context:
    - Dual-destination error logging: writes to both Python logger (console)
      and MongoDB 'error_logs' collection
    - Ensures errors are visible in logs even if MongoDB is unreachable
    - Persists errors in database for later analysis when MongoDB is reachable
    - Best-effort MongoDB write wrapped in its own try/except to avoid cascading failures

    Args:
        error: The exception that occurred
        location: Source location string (e.g., "auth/routes.py::register")
        additional_info: Optional dict with extra context about the error
    """
    error_doc = {
        "error_type": type(error).__name__,
        "error_message": str(error),
        "traceback": traceback.format_exc(),
        "location": location,
        "additional_info": additional_info or {},
        "timestamp": datetime.utcnow(),
    }

    # Always log to console
    logger.error(
        f"Error in {location} - {type(error).__name__}: {error}"
    )

    # Best-effort log to MongoDB
    try:
        db = await get_db()
        await db["error_logs"].insert_one(error_doc)
    except Exception:
        logger.error("Failed to log error to MongoDB (secondary failure)")
