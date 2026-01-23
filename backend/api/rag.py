"""
RAG API routes for the chatbot.
Proxies requests to HuggingFace Space RAG service.

Prerequisites:
    - Set HF_RAG_SPACE_URL environment variable to your HF Space URL
    - Example: https://your-username-timisoaralens-rag.hf.space
"""

import os
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

logger = logging.getLogger(__name__)

# No prefix here; main.py mounts at /api/rag
router = APIRouter(tags=["RAG"])

# Configuration
HF_RAG_SPACE_URL = os.getenv("HF_RAG_SPACE_URL", "")
TOP_K = 5


# Pydantic models
class ConversationMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class RAGQueryRequest(BaseModel):
    query: str
    conversation_history: Optional[list[ConversationMessage]] = None
    top_k: Optional[int] = TOP_K


class RAGQueryResponse(BaseModel):
    answer: str
    sources: list = []
    query: str


@router.post("/query", response_model=RAGQueryResponse)
async def rag_query(request: RAGQueryRequest):
    """
    Query the RAG system via HuggingFace Space.
    Proxies the request to the dedicated RAG service with optional conversation history.
    """
    if not HF_RAG_SPACE_URL:
        raise HTTPException(
            status_code=503,
            detail="RAG service not configured. Set HF_RAG_SPACE_URL environment variable."
        )
    
    try:
        logger.info(f"Proxying RAG query to HF Space: {request.query}")
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{HF_RAG_SPACE_URL}/query",
                json=request.dict(),
            )
            response.raise_for_status()
            data = response.json()
            
            return RAGQueryResponse(**data)
            
    except httpx.HTTPError as e:
        logger.error(f"HF Space request error: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"RAG service error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"RAG query error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"RAG error: {str(e)}")


@router.get("/health")
async def rag_health():
    """Check RAG service health"""
    if not HF_RAG_SPACE_URL:
        return {
            "status": "not_configured",
            "message": "HF_RAG_SPACE_URL not set"
        }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{HF_RAG_SPACE_URL}/health")
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "status": "error",
            "error": str(e)
        }


@router.get("/status")
async def rag_status():
    """Get RAG system status"""
    if not HF_RAG_SPACE_URL:
        return {
            "status": "not_configured",
            "hf_space_url": None,
            "message": "Set HF_RAG_SPACE_URL environment variable"
        }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{HF_RAG_SPACE_URL}/status")
            response.raise_for_status()
            data = response.json()
            data["hf_space_url"] = HF_RAG_SPACE_URL
            return data
    except Exception as e:
        logger.error(f"Status check error: {e}")
        return {
            "status": "error",
            "hf_space_url": HF_RAG_SPACE_URL,
            "error": str(e)
        }

