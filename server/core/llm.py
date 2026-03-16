# core/llm.py
from openai import AsyncOpenAI
from server.core.config import settings
from server.db.mongo import log_error

# Initialize client (note: This will be initialized once and reused)
client: AsyncOpenAI | None = None


async def get_openai_client():
    """
    Deep Technical Context:
    - Lazily initializes a singleton AsyncOpenAI client
    - Uses module-level global to maintain a single connection across the application lifecycle
    - On failure, logs error to both console and MongoDB error_logs collection, then re-raises
    - Get or initialize the OpenAI client
    - Returns the existing client if already initialized, otherwise creates a new one
    """
    global client
    try:
        if client is None:
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        return client

    except Exception as e:
        await log_error(e, "core/llm.py", "get_openai_client")
        raise e
