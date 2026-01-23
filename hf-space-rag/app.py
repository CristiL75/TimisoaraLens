"""
HuggingFace Space - TimisoaraLens RAG Service
FastAPI service for RAG queries using Qdrant + HF Router
"""

import os
import logging
from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
import httpx
from langdetect import detect, LangDetectException

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TimisoaraLens RAG Service",
    description="RAG service for Timisoara city information",
    version="1.0.0"
)

# Configuration from Secrets
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
HF_TOKEN = os.getenv("HF_TOKEN", "")
HF_MODEL = os.getenv("HF_MODEL", "google/flan-t5-small")
HF_BASE_URL = os.getenv("HF_BASE_URL", "https://router.huggingface.co/v1")
COLLECTION_NAME = "timisoara_knowledge"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
TOP_K = 5

# Lazy load models
_embedding_model = None
_qdrant_client = None


def get_embedding_model():
    """Lazy load embedding model."""
    global _embedding_model
    if _embedding_model is None:
        logger.info(f"Loading embedding model {EMBEDDING_MODEL}...")
        _embedding_model = SentenceTransformer(EMBEDDING_MODEL)
    return _embedding_model


def get_qdrant_client():
    """Lazy load Qdrant client."""
    global _qdrant_client
    if _qdrant_client is None:
        if not QDRANT_URL or not QDRANT_API_KEY:
            raise RuntimeError(
                "QDRANT_URL and QDRANT_API_KEY not set in Secrets"
            )
        logger.info(f"Connecting to Qdrant: {QDRANT_URL}")
        _qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    return _qdrant_client


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


async def query_hf_router(prompt: str, max_tokens: int = 150) -> str:
    """Call HF Router for text generation."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{HF_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {HF_TOKEN}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": HF_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens,
                    "temperature": 0.7,
                    "top_p": 0.9,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        logger.warning(f"HF Router error (fallback): {e}")
        return (
            "Am găsit informații din bază, dar nu am putut genera complet acum. "
            "Încearcă din nou sau pune o întrebare mai scurtă."
        )


@app.post("/query", response_model=RAGQueryResponse)
async def rag_query(request: RAGQueryRequest):
    """
    Query the RAG system.
    
    Steps:
    1. Embed the query
    2. Search similar documents in Qdrant
    3. Build context from results
    4. Generate answer using HF Router
    5. Return answer + sources
    """
    try:
        embedding_model = get_embedding_model()
        qdrant_client = get_qdrant_client()

        # Embed query
        logger.info(f"Embedding query: {request.query}")
        query_embedding = embedding_model.encode(request.query, convert_to_numpy=True)

        # Search in Qdrant
        logger.info(f"Searching top {request.top_k} documents...")
        search_result = qdrant_client.query_points(
            collection_name=COLLECTION_NAME,
            query=query_embedding.tolist(),
            limit=request.top_k,
            score_threshold=0.5,
        ).points

        # Extract sources and build context
        sources = []
        context_text = ""

        for i, result in enumerate(search_result, 1):
            payload = result.payload
            score = result.score

            sources.append({
                "rank": i,
                "score": float(score),
                "heading": payload.get("heading", "N/A"),
                "source": payload.get("source", "N/A"),
                "snippet": payload.get("text", "")[:200] + "...",
            })

            context_text += f"[Sursa {i}] {payload.get('heading', 'N/A')}\n"
            context_text += f"{payload.get('text', '')}\n\n"

        # Detect query language
        try:
            detected_lang = detect(request.query)
            logger.info(f"Detected language: {detected_lang}")
        except LangDetectException:
            detected_lang = "ro"  # Default to Romanian
            logger.warning("Language detection failed, defaulting to Romanian")

        # Language-specific instructions
        lang_instructions = {
            "en": "Answer in English.",
            "ro": "Răspunde în română.",
            "de": "Antworte auf Deutsch.",
            "fr": "Répondez en français.",
            "es": "Responde en español.",
            "it": "Rispondi in italiano.",
            "hu": "Válaszolj magyarul.",
        }
        answer_language = lang_instructions.get(detected_lang, "Answer in the same language as the question.")

        # Build system prompt with language instruction
        system_prompt = (
            f"You are a helpful assistant about Timișoara, Romania. "
            f"Answer questions based on the provided context. "
            f"If you don't know the answer, say so politely. "
            f"{answer_language} "
            f"Keep answers concise and relevant. "
            f"You can refer to previous conversation if relevant."
        )

        # Build conversation context if available
        conversation_context = ""
        if request.conversation_history:
            conversation_context = "Previous conversation:\n"
            for msg in request.conversation_history[-4:]:  # Keep last 4 messages for context
                role = "User" if msg.role == "user" else "Assistant"
                conversation_context += f"{role}: {msg.content}\n"
            conversation_context += "\n"

        user_prompt = f"""{conversation_context}Knowledge base context:
{context_text}

New question: {request.query}

Short and relevant answer based on context:"""

        full_prompt = f"{system_prompt}\n\n{user_prompt}"

        # Generate
        logger.info("Generating answer...")
        answer = await query_hf_router(full_prompt, max_tokens=200)

        return RAGQueryResponse(
            query=request.query,
            answer=answer,
            sources=sources,
        )

    except Exception as e:
        logger.error(f"RAG query error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"RAG error: {str(e)}")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "service": "TimisoaraLens RAG"}


@app.get("/status")
async def rag_status():
    """Check RAG system status"""
    try:
        qdrant_client = get_qdrant_client()
        collection_info = qdrant_client.get_collection(COLLECTION_NAME)
        return {
            "status": "ok",
            "collection": COLLECTION_NAME,
            "vectors_count": collection_info.points_count,
            "embedding_model": EMBEDDING_MODEL,
        }
    except Exception as e:
        logger.error(f"Status check error: {e}")
        return {
            "status": "error",
            "error": str(e)
        }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "TimisoaraLens RAG Service",
        "version": "1.0.0",
        "endpoints": {
            "/query": "POST - Query the RAG system",
            "/health": "GET - Health check",
            "/status": "GET - System status",
            "/docs": "GET - API documentation"
        }
    }
