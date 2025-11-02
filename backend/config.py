"""
Configuration module for CityLens Backend
Loads and manages all environment variables and settings
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
import os

class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = True
    
    # Ollama Configuration
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"
    
    # ChromaDB Configuration
    chroma_db_path: str = "./data/chroma_db"
    collection_name: str = "timisoara_knowledge"
    
    # Model Paths
    vision_model_path: str = "./models/mobilenet_timisoara.pth"
    embeddings_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    
    # Data Paths
    coordinates_json: str = "./data/coordinates.json"
    metadata_json: str = "./data/metadata.json"
    images_path: str = "./data/images"
    documents_path: str = "./data/documents"
    
    # App Settings
    max_upload_size: int = 10485760  # 10MB
    allowed_origins: str = "http://localhost:19000,http://localhost:19001"
    
    # Database
    database_url: str = "sqlite+aiosqlite:///./data/app.db"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()

# Global settings instance
settings = get_settings()
