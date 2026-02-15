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
            "pret de", "lei/noapte", "rezervare", "disponibil"
        ]
        
        # If response mentions historical facts, city info → knowledge endpoint  
        knowledge_signals = [
            "timișoara", "istori", "revoluți", "cultur", "oraș",
            "în anul", "eveniment", "monument", "fondată"
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
    Use LLM to semantically classify if query is about apartments/accommodation or general knowledge.
    Takes conversation history into account for contextual queries.
    Returns: 'apartments' or 'knowledge'
    """
    if not HF_RAG_SPACE_URL:
        return "knowledge"
    
    # Pre-check: ONLY for very explicit apartment queries (fast path)
    # Let LLM handle semantic variants and synonyms
    query_lower = query.lower()
    explicit_apartment_keywords = [
        "apartament", "apartamente", "apartment", "apartments",
        "aprtament", "apartamnt",  # Common typos
        "cazare", "accommodation", "inchiriere", "rent",
        "listing", "listare", "listat",
        "rezervare", "booking",
    ]
    
    # Fast path for explicit queries only
    if any(keyword in query_lower for keyword in explicit_apartment_keywords):
        logger.info(f"[CLASSIFICATION] Pre-check: explicit apartment keyword → apartments")
        return "apartments"
    
    # Everything else (including synonyms, contextual queries) → LLM classification
    
    try:
        # Build context from conversation history
        context = ""
        if conversation_history:
            recent = conversation_history[-2:]  # Last 2 messages
            for msg in recent:
                role = msg.role if hasattr(msg, 'role') else 'user'
                content = msg.content if hasattr(msg, 'content') else ''
                context += f"{role}: {content}\n"
            context = f"\nRecent conversation:\n{context}"
        
        prompt = f"""Classify this query. Answer ONLY: APARTMENTS or KNOWLEDGE{context}

Query: "{query}"

APARTMENTS database contains:
- Accommodation listings (apartments, rooms, prices, facilities)
- Owner information and contacts
- POI routes/itineraries recommended by apartment owners
- Booking, availability, reviews

KNOWLEDGE database contains:
- Timișoara city history, culture, architecture
- General tourism info not related to specific accommodations
- Historical events, monuments, city facts

SEMANTIC CLASSIFICATION - Understand meaning, not just keywords:
✓ "traseu/itinerary/route recommended" → APARTMENTS (owner's POI list)
✓ "ce sugerează/propune/recomandă" → APARTMENTS (if about owner)
✓ "gazda/proprietar/owner/host" → APARTMENTS
✓ "puncte de interes/locuri/pois" from owner → APARTMENTS
✓ "istoric/history/revoluție" NOT about apartments → KNOWLEDGE

EXAMPLES:
"apartament ieftin" → APARTMENTS
"ce traseu turistic propune?" → APARTMENTS (owner's POI route)
"ce locuri interesante recomandă gazda?" → APARTMENTS
"un itinerar pentru vizitat orașul" → APARTMENTS (if owner context, else KNOWLEDGE)
"cine este proprietarul?" → APARTMENTS
"revoluția din 1989" → KNOWLEDGE
"istoria Timișoarei" → KNOWLEDGE

Answer (APARTMENTS or KNOWLEDGE):"""

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{HF_RAG_SPACE_URL}/generate",
                json={"prompt": prompt, "max_tokens": 5}
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
                # Tie or no clear signal - detect last endpoint from conversation
                logger.warning(f"[CLASSIFICATION] LLM response unclear, using conversation context tracking")
                
                # Detect last endpoint used by analyzing conversation history
                last_endpoint = _detect_last_endpoint(conversation_history)
                
                if last_endpoint:
                    logger.info(f"[CLASSIFICATION] Continuing with last endpoint: {last_endpoint}")
                    return last_endpoint
                
                # No history - use simple heuristic only for explicit apartment queries
                query_lower = query.lower()
                if any(k in query_lower for k in ["apartament", "cazare", "lei", "dormitor"]):
                    logger.info("[CLASSIFICATION] Default: apartments (explicit query)")
                    return "apartments"
                
                logger.info("[CLASSIFICATION] Default: knowledge (no context)")
                return "knowledge"
                
    except Exception as e:
        logger.warning(f"[CLASSIFICATION] LLM call failed: {e}, analyzing query and context")
        # Fallback: direct query + history analysis
        query_lower = query.lower()
        apartment_signals = ["apartament", "cazare", "accommodation", "stay", "booking", "rent", "dormitor", "lei", "pret", "price", "owner", "proprietar"]
        
        # Check query
        if any(k in query_lower for k in apartment_signals):
            logger.info("[CLASSIFICATION] Fallback query: apartments")
            return "apartments"
        
        # Check conversation history
        if conversation_history:
            for msg in conversation_history[-3:]:
                content_lower = msg.content.lower() if hasattr(msg, 'content') else ''
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

