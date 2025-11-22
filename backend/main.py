"""
CityLens Timișoara FastAPI Backend
Main application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Import routers
from api import auth, gps, rag, quiz, listings
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

# NOTE: Vision module (image recognition) will be added later in development

if __name__ == "__main__":
    port = int(os.getenv("API_PORT", 8000))
    host = os.getenv("API_HOST", "0.0.0.0")
    
    print(f"🌐 Starting server on http://{host}:{port}")
    print("📖 API Documentation: http://localhost:8000/docs")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True
    )
