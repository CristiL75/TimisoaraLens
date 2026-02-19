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


def _serialize_conversation_history(conversation_history: Optional[list]) -> list:
    if not conversation_history:
        return []

    serialized = []
    for msg in conversation_history:
        if msg is None:
            continue
        if isinstance(msg, dict):
            role = msg.get("role")
            content = msg.get("content")
        else:
            role = getattr(msg, "role", None)
            content = getattr(msg, "content", None)

        if role is None and content is None:
            continue
        serialized.append({
            "role": str(role or "user"),
            "content": str(content or ""),
        })

    return serialized


# Helper function to generate suggested questions
async def generate_suggested_questions(answer: str, sources: list, original_query: str) -> list:
    """
    Generate 3-5 contextual follow-up questions using the HF Space LLM.
    """
    if not HF_RAG_SPACE_URL or not answer:
        return []
    
    try:
        is_fallback = False
        if answer:
            ans_low = answer.strip().lower()
            if ans_low.startswith("nu am informatii despre asta") or ans_low.startswith("i don't have information"):
                is_fallback = True

        if is_fallback:
            context = f"Original question: {original_query}"
        else:
            context = f"Based on this answer about Timișoara: {answer[:300]}"

        # Prepare prompt for LLM
        prompt = f"""You are a helpful tour guide chatbot for Timișoara. 
    Based on this information: {context}

    Original question: {original_query}

    Generate exactly 3 follow-up questions that the USER could ask next about Timișoara.
    Write each question from the user's perspective (e.g., "Ce pot vizita...?", "Unde pot manca...?").
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


def _detect_last_endpoint(conversation_history: Optional[list]) -> Optional[str]:
    """
    Detect the last endpoint used by analyzing conversation history.
    Returns 'apartments' or 'knowledge' or None if unclear.
    """
    if not conversation_history or len(conversation_history) < 2:
        return None
    
    # Look at last few assistant responses to see which endpoint was used
    for msg in reversed(conversation_history[-6:]):
        if not hasattr(msg, 'role') or not hasattr(msg, 'content'):
            continue
            
        if msg.role != 'assistant':
            continue
            
        content_lower = msg.content.lower()
        
        # If response mentions listings, apartments cards, prices with lei → apartments endpoint
        apartment_signals = [
            "listing", "apartament", "cazare", "proprietar", "dormitor",
            "pret de", "lei/noapte", "rezervare", "disponibil",
            "ionut popescu", "latcu", "cristian-simion",  # Specific owners
            "constructorilor", "piata libertatii", "piața libertății",  # Apartment addresses
            "puncte de interes recomandate", "traseu", "itinerar",  # POI from owners
            "0721163837", "072356535",  # Phone numbers (owner contacts)
            "narativ coffe", "hype culture",  # Specific POIs from owners
            "owner_phone", "owner_email", "contact:"  # Contact fields
        ]
        
        # If response mentions historical facts, city info → knowledge endpoint  
        knowledge_signals = [
            "timișoara", "istori", "revoluți", "cultur", "oraș",
            "în anul", "eveniment", "monument", "fondată",
            "catedrala", "piata victoriei"  # General city landmarks (not owner POIs)
        ]
        
        apartment_score = sum(1 for s in apartment_signals if s in content_lower)
        knowledge_score = sum(1 for s in knowledge_signals if s in content_lower)
        
        # Clear signal from last assistant response
        if apartment_score > knowledge_score and apartment_score >= 2:
            return "apartments"
        elif knowledge_score > apartment_score and knowledge_score >= 2:
            return "knowledge"
    
    return None


async def classify_query_intent(query: str, conversation_history: Optional[list] = None) -> str:
    """
    Use LLM to semantically classify if query is about apartments, services, or general knowledge.
    Takes conversation history into account for contextual queries.
    Returns: 'apartments' or 'services' or 'knowledge'
    """
    if not HF_RAG_SPACE_URL:
        return "knowledge"
    
    # Build lexical hints (used only for logging/fallback, not hard routing)
    query_lower = query.lower()
    explicit_apartment_keywords = [
        "apartament", "apartamente", "apartment", "apartments",
        "aprtament", "apartamnt",  # Common typos
        "cazare", "accommodation",
        "listing", "listare", "listat",
    ]
    explicit_services_keywords = [
        "serviciu", "servicii", "service", "services",
        "provider", "restaurant", "pub", "club", "nightlife",
        "barber", "spa", "masaj", "massage", "rent a car", "rent-a-car", "masina",
        "eveniment", "event", "workshop", "tur ghidat", "guided tour", "activitate indoor",
        "experienta", "experiente", "experience", "experiences",
        "masa", "table", "room", "spatiu",
    ]
    
    has_service_hint = any(keyword in query_lower for keyword in explicit_services_keywords)
    has_apartment_hint = any(keyword in query_lower for keyword in explicit_apartment_keywords)
    logger.info(
        "[CLASSIFICATION] lexical hints: services=%s apartments=%s",
        has_service_hint,
        has_apartment_hint,
    )
    
    # Everything else (including synonyms, contextual queries) → LLM classification

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            serialized_history = _serialize_conversation_history(conversation_history)
            response = await client.post(
                f"{HF_RAG_SPACE_URL}/classify",
                json={
                    "query": query,
                    "conversation_history": serialized_history,
                },
            )
            response.raise_for_status()
            result = response.json().get("domain", "").strip().upper()
            logger.info(f"[CLASSIFICATION] LLM raw response: '{result}'")

            if result == "APARTMENTS":
                return "apartments"
            if result == "SERVICES":
                return "services"
            if result == "KNOWLEDGE":
                return "knowledge"

            logger.warning("[CLASSIFICATION] Unexpected domain, falling back")

    except Exception as e:
        logger.warning(f"[CLASSIFICATION] LLM call failed: {e}, analyzing query and context")
        # Fallback: direct query + history analysis
        query_lower = query.lower()
        apartment_signals = ["apartament", "cazare", "accommodation", "stay", "dormitor", "lei", "pret", "price", "owner", "proprietar"]
        service_signals = [
            "serviciu", "service", "provider", "restaurant", "pub", "club", "barber", "spa",
            "workshop", "experienta", "experience", "masa", "table", "room", "spatiu",
            "event", "tur ghidat", "guided tour", "rent a car", "rent-a-car", "masina", "inchiriere",
        ]
        
        # Check query (services first)
        if any(k in query_lower for k in service_signals):
            logger.info("[CLASSIFICATION] Fallback query: services")
            return "services"
        if any(k in query_lower for k in apartment_signals):
            logger.info("[CLASSIFICATION] Fallback query: apartments")
            return "apartments"
        
        # Check conversation history
        if conversation_history:
            for msg in conversation_history[-3:]:
                content_lower = msg.content.lower() if hasattr(msg, 'content') else ''
                if any(k in content_lower for k in service_signals):
                    logger.info("[CLASSIFICATION] Fallback history: services")
                    return "services"
                if any(k in content_lower for k in apartment_signals):
                    logger.info("[CLASSIFICATION] Fallback history: apartments")
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
    logger.info(f"====== RAG QUERY START (v2.0 semantic classification) ======")
    logger.info(f"Query: {request.query}")
    
    if not HF_RAG_SPACE_URL:
        logger.error("HF_RAG_SPACE_URL not configured!")
        raise HTTPException(
            status_code=503,
            detail="RAG service not configured. Set HF_RAG_SPACE_URL environment variable."
        )
    
    logger.info(f"HF_RAG_SPACE_URL configured: {HF_RAG_SPACE_URL[:50]}...")
    
    try:
        logger.info(f"Proxying RAG query to HF Space: {request.query}")
        
        # Use LLM to classify query intent with conversation context
        logger.info(f"[CLASSIFICATION] Starting LLM classification for query: {request.query}")
        intent = await classify_query_intent(request.query, request.conversation_history)
        if intent == "apartments":
            endpoint = "/query_apartments"
        elif intent == "services":
            endpoint = "/query_services"
        else:
            endpoint = "/query"
        logger.info(f"[CLASSIFICATION] LLM classified intent: '{intent}' -> using endpoint: {endpoint}")

        async with httpx.AsyncClient(timeout=60.0) as client:
            request_payload = {
                "query": request.query,
                "conversation_history": _serialize_conversation_history(request.conversation_history),
                "top_k": request.top_k,
            }
            response = await client.post(
                f"{HF_RAG_SPACE_URL}{endpoint}",
                json=request_payload,
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

