# main.py
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from server.core.logging_config import get_logger, setup_logging
from server.core.config import settings

SPA_DIR = Path(__file__).resolve().parent.parent / "client" / "dist"

# Initialize logging before anything else
setup_logging()
logger = get_logger(__name__)

# Register LLM providers
import server.core.providers  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Deep Technical Context:
    - FastAPI lifespan context manager for startup/shutdown logic
    - Validates MongoDB connectivity on startup by issuing a ping command
    - Logs startup and shutdown events for operational visibility
    - If MongoDB is unreachable on startup, the error propagates and prevents serving
    """
    logger.info("SurveyAgent API starting up...")

    # Validate database connection on startup
    from server.db.mongo import get_db
    try:
        db = await get_db()
        await db.command("ping")
        logger.info("MongoDB connection verified")
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")
        raise

    yield

    logger.info("SurveyAgent API shutting down...")


app = FastAPI(
    title="SurveyAgent API",
    description="AI-powered conversational survey platform",
    version="0.1.0",
    docs_url="/docs" if settings.ENABLE_DOCS else None,
    redoc_url="/redoc" if settings.ENABLE_DOCS else None,
    lifespan=lifespan,
    redirect_slashes=False,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from server.auth.routes import router as auth_router
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])

from server.surveys.routes import router as surveys_router
app.include_router(surveys_router, prefix="/api/v1/surveys", tags=["Surveys"])

from server.ai.routes import router as ai_router
app.include_router(ai_router, prefix="/api/v1/ai", tags=["AI"])

from server.interviewer.routes import router as interview_router
app.include_router(interview_router, prefix="/api/v1/interview", tags=["Interview"])

from server.analytics.routes import router as analytics_router
app.include_router(analytics_router, prefix="/api/v1/analytics", tags=["Analytics"])

from server.orgs.routes import router as org_router
app.include_router(org_router, prefix="/api/v1/org", tags=["Organization"])

from server.teams.routes import router as teams_router
app.include_router(teams_router, prefix="/api/v1/teams", tags=["Teams"])


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


# Serve React SPA from client/dist when built (production single-app mode).
if SPA_DIR.exists():
    from fastapi.responses import FileResponse, Response

    # Serve static assets (JS, CSS, images) at /assets
    app.mount("/assets", StaticFiles(directory=SPA_DIR / "assets"), name="static-assets")

    # Root route serves index.html
    @app.get("/")
    async def serve_spa_root():
        return FileResponse(SPA_DIR / "index.html")

    # Custom 404 handler: for non-API paths, serve index.html (SPA client-side routing)
    @app.exception_handler(404)
    async def spa_fallback(request, exc):
        path = request.url.path
        if path.startswith(("/api/", "/docs", "/redoc", "/openapi.json", "/health")):
            return Response(
                content='{"detail":"Not Found"}',
                status_code=404,
                media_type="application/json",
            )
        # Check for real static file first
        file = SPA_DIR / path.lstrip("/")
        if file.exists() and file.is_file():
            return FileResponse(file)
        return FileResponse(SPA_DIR / "index.html")
else:

    @app.get("/")
    async def root():
        """Root endpoint - API info (dev mode, no SPA build)."""
        return {"message": "SurveyAgent API is running."}
