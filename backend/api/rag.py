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


async def classify_query_intent(query: str) -> str:
    """
    Use LLM to semantically classify if query is about apartments/accommodation or general knowledge.
    Returns: 'apartments' or 'knowledge'
    """
    if not HF_RAG_SPACE_URL:
        return "knowledge"
    
    try:
        prompt = f"""You are a query router for a tourism chatbot about Timișoara, Romania.

You have TWO databases:
1. APARTMENTS database: Contains apartment listings with owners, prices, facilities, and POI recommendations from apartment owners
2. KNOWLEDGE database: Contains general information about Timișoara's history, culture, events, attractions

Analyze this query and decide which database to use. Think about:
- Is the user looking for a place to stay? → APARTMENTS
- Is the user asking about apartment features (price, rooms, facilities)? → APARTMENTS  
- Is the user asking about POI recommendations from a specific apartment owner? → APARTMENTS
- Is the user asking general questions about the city? → KNOWLEDGE

Query: "{query}"

Think step by step:
1. What is the user asking for?
2. Which database contains this information?

Answer with ONLY one word: APARTMENTS or KNOWLEDGE"""

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{HF_RAG_SPACE_URL}/generate",
                json={"prompt": prompt, "max_tokens": 50}
            )
            response.raise_for_status()
            result = response.json().get("text", "").strip()
            logger.info(f"[CLASSIFICATION] LLM raw response: '{result}'")
            
            # Semantic analysis of response using multiple signals
            result_lower = result.lower()
            
            # Strong apartment signals
            apartment_indicators = [
                "apartment", "apartament", "accommodation", "accomodation",
                "lodging", "stay", "rent", "booking", "hotel", "cazare"
            ]
            
            # Strong knowledge signals  
            knowledge_indicators = [
                "knowledge", "history", "culture", "general", "tourism",
                "historie", "cultura", "turism"
            ]
            
            # Count signals in LLM response
            apartment_score = sum(1 for indicator in apartment_indicators if indicator in result_lower)
            knowledge_score = sum(1 for indicator in knowledge_indicators if indicator in result_lower)
            
            logger.info(f"[CLASSIFICATION] Scores - apartments: {apartment_score}, knowledge: {knowledge_score}")
            
            # Decision based on scores
            if apartment_score > knowledge_score:
                logger.info("[CLASSIFICATION] Decision: apartments (based on semantic analysis)")
                return "apartments"
            elif knowledge_score > apartment_score:
                logger.info("[CLASSIFICATION] Decision: knowledge (based on semantic analysis)")
                return "knowledge"
            else:
                # Tie or no clear signal - use query analysis as fallback
                logger.warning(f"[CLASSIFICATION] LLM response unclear, analyzing query directly")
                query_lower = query.lower()
                apartment_query_signals = ["apartament", "cazare", "accommodation", "stay", "booking", "rent", "dormitor", "lei", "pret", "price"]
                if any(k in query_lower for k in apartment_query_signals):
                    logger.info("[CLASSIFICATION] Query analysis: apartments")
                    return "apartments"
                logger.info("[CLASSIFICATION] Query analysis: knowledge (default)")
                return "knowledge"
                
    except Exception as e:
        logger.warning(f"[CLASSIFICATION] LLM call failed: {e}, analyzing query directly")
        # Fallback: direct query analysis
        query_lower = query.lower()
        apartment_signals = ["apartament", "cazare", "accommodation", "stay", "booking", "rent", "dormitor", "lei", "pret", "price", "owner", "proprietar"]
        if any(k in query_lower for k in apartment_signals):
            logger.info("[CLASSIFICATION] Fallback: apartments")
            return "apartments"
        logger.info("[CLASSIFICATION] Fallback: knowledge")
        return "knowledge"


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
        
        # Use LLM to classify query intent instead of hardcoded keywords
        logger.info(f"[CLASSIFICATION] Starting LLM classification for query: {request.query}")
        intent = await classify_query_intent(request.query)
        endpoint = "/query_apartments" if intent == "apartments" else "/query"
        logger.info(f"[CLASSIFICATION] LLM classified intent: '{intent}' -> using endpoint: {endpoint}")

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

