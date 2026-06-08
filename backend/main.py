"""
CityLens Timișoara FastAPI Backend
Main application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from contextlib import asynccontextmanager
import uvicorn
from dotenv import load_dotenv
import os
import time
from collections import defaultdict, deque
from threading import Lock

# Load environment variables
load_dotenv()

# Import routers
from api import auth, gps, quiz, listings, rag, bookings, apartment_bookings
from database_mongo import connect_to_mongo, close_mongo_connection

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    print("🚀 Starting CityLens Backend...")
    print("🗄️ Connecting to MongoDB...")
    await connect_to_mongo()
    print("📍 Initializing AI modules...")
    # TODO: Initialize ChromaDB, load models
    yield
    print("👋 Shutting down CityLens Backend...")
    await close_mongo_connection()

# Initialize FastAPI app
app = FastAPI(
    title="CityLens Timișoara API",
    description="Backend API pentru aplicația CityLens - Explorare inteligentă a Timișoarei",
    version="1.0.0",
    lifespan=lifespan
)


def _env_bool(name: str, default: bool) -> bool:
    value = (os.getenv(name) or "").strip().lower()
    if not value:
        return default
    return value in {"1", "true", "yes", "on"}


def _is_production_env() -> bool:
    environment = (os.getenv("APP_ENV") or os.getenv("ENVIRONMENT") or "").strip().lower()
    return environment in {"prod", "production"} or bool(os.getenv("RENDER"))


class SimpleRateLimiter:
    def __init__(self):
        self.enabled = _env_bool("RATE_LIMIT_ENABLED", True)
        self.window_seconds = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
        self.default_limit = int(os.getenv("RATE_LIMIT_DEFAULT_MAX_REQUESTS", "180"))
        self.auth_limit = int(os.getenv("RATE_LIMIT_AUTH_MAX_REQUESTS", "20"))
        self.assistant_limit = int(os.getenv("RATE_LIMIT_ASSISTANT_MAX_REQUESTS", "45"))
        self.rag_limit = int(os.getenv("RATE_LIMIT_RAG_MAX_REQUESTS", "60"))
        self._buckets = defaultdict(deque)
        self._lock = Lock()

    def _client_ip(self, request) -> str:
        forwarded = (request.headers.get("x-forwarded-for") or "").strip()
        if forwarded:
            return forwarded.split(",", 1)[0].strip()
        cf_ip = (request.headers.get("cf-connecting-ip") or "").strip()
        if cf_ip:
            return cf_ip
        return (request.client.host if request.client else "unknown") or "unknown"

    def _route_bucket_and_limit(self, path: str) -> tuple[str, int]:
        normalized = (path or "").lower()
        if normalized.startswith("/api/auth/login"):
            return "auth", self.auth_limit
        if normalized.startswith("/api/bookings/assistant"):
            return "assistant", self.assistant_limit
        if normalized.startswith("/api/rag/query"):
            return "rag", self.rag_limit
        return "default", self.default_limit

    def check(self, request) -> tuple[bool, int, int]:
        if not self.enabled:
            return True, self.default_limit, 0

        route_bucket, limit = self._route_bucket_and_limit(str(request.url.path))
        key = f"{self._client_ip(request)}:{route_bucket}"
        now = time.time()
        cutoff = now - self.window_seconds

        with self._lock:
            bucket = self._buckets[key]
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()

            if len(bucket) >= limit:
                retry_after = max(1, int(bucket[0] + self.window_seconds - now)) if bucket else self.window_seconds
                return False, limit, retry_after

            bucket.append(now)
            return True, limit, 0


rate_limiter = SimpleRateLimiter()


SECURITY_HEADERS_ENABLED = _env_bool("SECURITY_HEADERS_ENABLED", True)
FORCE_HTTPS = _env_bool("FORCE_HTTPS", _is_production_env())
CONTENT_SECURITY_POLICY = os.getenv(
    "CONTENT_SECURITY_POLICY",
    "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
)


@app.middleware("http")
async def rate_limit_middleware(request, call_next):
    path = str(request.url.path or "")
    if path in {"/", "/health"}:
        return await call_next(request)

    allowed, limit, retry_after = rate_limiter.check(request)
    if not allowed:
        return JSONResponse(
            status_code=429,
            content={
                "success": False,
                "detail": "Too many requests. Please try again later.",
            },
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Window": str(rate_limiter.window_seconds),
            },
        )

    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(limit)
    response.headers["X-RateLimit-Window"] = str(rate_limiter.window_seconds)
    return response


@app.middleware("http")
async def security_headers_middleware(request, call_next):
    if FORCE_HTTPS:
        forwarded_proto = (request.headers.get("x-forwarded-proto") or "").split(",", 1)[0].strip()
        request_scheme = forwarded_proto or request.url.scheme
        if request_scheme == "http":
            https_url = request.url.replace(scheme="https")
            return RedirectResponse(str(https_url), status_code=307)

    response = await call_next(request)

    if SECURITY_HEADERS_ENABLED:
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        response.headers.setdefault("Content-Security-Policy", CONTENT_SECURITY_POLICY)
        if FORCE_HTTPS:
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

    return response

# CORS Configuration
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:19000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/")
async def root():
    """Root endpoint - health check"""
    return {
        "status": "online",
        "service": "CityLens Timișoara API",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "modules": {
            "api": "ok",
            "database": "ok",
            "ollama": "checking...",
            "chromadb": "checking..."
        }
    }

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(gps.router, prefix="/api/gps", tags=["GPS"])
app.include_router(rag.router, prefix="/api/rag", tags=["RAG"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["Quiz"])
app.include_router(listings.router, prefix="/api/listings", tags=["Listings"])
app.include_router(bookings.router, prefix="/api/bookings", tags=["Bookings"])
app.include_router(apartment_bookings.router, prefix="/api/apartment-bookings", tags=["Apartment Bookings"])

# NOTE: Vision module (image recognition) will be added later in development

if __name__ == "__main__":
    # Use the port provided by the environment (Render sets $PORT), fallback to 8000 for local dev
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("API_HOST", "0.0.0.0")
    reload_enabled = _env_bool("UVICORN_RELOAD", not _is_production_env())
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload_enabled
    )
