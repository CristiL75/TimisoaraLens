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

# Helper function to generate suggested questions
async def generate_suggested_questions(answer: str, sources: list, original_query: str) -> list:
    """
    Generate 3-5 contextual follow-up questions using the HF Space LLM.
    """
    if not HF_RAG_SPACE_URL or not answer:
        return []
    
    try:
        # Prepare context for question generation
        context = f"Based on this answer about Timișoara: {answer[:300]}"
        
        # Prepare prompt for LLM
        prompt = f"""You are a helpful tour guide chatbot for Timișoara. 
Based on this information: {context}

Original question: {original_query}

Generate exactly 3 follow-up questions that would help users explore related topics about Timișoara.
Format: Return ONLY the questions separated by newlines, no numbering or bullets.
Make questions natural, concise (max 10 words each), and relevant to tourism/business/culture."""
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Call HF Space LLM endpoint
            response = await client.post(
                f"{HF_RAG_SPACE_URL}/generate",
                json={"prompt": prompt, "max_tokens": 150},
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                generated_text = data.get("generated_text", "")
                
                # Parse questions from response
                questions = [q.strip() for q in generated_text.split('\n') if q.strip() and len(q.strip()) > 5]
                return questions[:5]  # Return max 5 questions
            else:
                logger.warning(f"HF Space generation failed: {response.status_code}")
                return []
                
    except Exception as e:
        logger.warning(f"Error generating suggested questions: {e}")
        return []


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
    suggested_questions: list = []  # New: LLM-generated follow-up questions


@router.post("/query", response_model=RAGQueryResponse)
async def rag_query(request: RAGQueryRequest):
    """
    Query the RAG system via HuggingFace Space.
    Proxies the request to the dedicated RAG service with optional conversation history.
    Includes LLM-generated suggested follow-up questions.
    """
    if not HF_RAG_SPACE_URL:
        raise HTTPException(
            status_code=503,
            detail="RAG service not configured. Set HF_RAG_SPACE_URL environment variable."
        )
    
    try:
        logger.info(f"Proxying RAG query to HF Space: {request.query}")
        
        apartment_keywords = [
            "apartament", "apartamente", "cazare", "regim hotelier", "studio",
            "garsoniera", "accommodation", "apartment", "flat", "lodging",
            "rent", "booking", "stay",
            # Owner names to detect apartment queries about specific owners
            "latcu", "cristian", "simion", "popescu", "ionut", "cristil75",
            # POI queries related to apartments
            "traseu", "turistic", "cafenea", "restaurant", "recomandat",
            "puncte", "interes",
        ]
        query_lower = request.query.lower()
        use_apartments = any(k in query_lower for k in apartment_keywords)
        endpoint = "/query_apartments" if use_apartments else "/query"
        logger.info(f"Using endpoint: {endpoint} (apartments={use_apartments})")

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{HF_RAG_SPACE_URL}{endpoint}",
                json=request.dict(),
            )
            response.raise_for_status()
            data = response.json()
            
            # Generate suggested questions based on the answer
            suggested_questions = await generate_suggested_questions(
                answer=data.get("answer", ""),
                sources=data.get("sources", []),
                original_query=request.query
            )
            
            return RAGQueryResponse(
                answer=data.get("answer", ""),
                sources=data.get("sources", []),
                query=request.query,
                suggested_questions=suggested_questions
            )
            
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

