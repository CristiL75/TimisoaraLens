---
title: TimisoaraLens RAG Service
emoji: 🏛️
colorFrom: blue
colorTo: purple
sdk: docker
pinned: false
license: mit
---

# TimisoaraLens RAG Service

RAG (Retrieval-Augmented Generation) service for TimisoaraLens city guide app.

## Features

- **Semantic Search**: Uses sentence-transformers embeddings and Qdrant vector DB
- **AI Generation**: Powered by HuggingFace Router for Romanian language responses
- **FastAPI**: RESTful API with automatic documentation

## API Endpoints

- `POST /query` - Query the RAG system with a question
- `GET /health` - Health check
- `GET /status` - System status and collection info
- `GET /docs` - Swagger API documentation

## Configuration

Set these secrets in your HuggingFace Space settings:

```bash
QDRANT_URL=<your-qdrant-cloud-url>
QDRANT_API_KEY=<your-qdrant-api-key>
HF_TOKEN=<your-huggingface-token>
HF_MODEL=google/flan-t5-small
HF_BASE_URL=https://router.huggingface.co/v1
```

## Example Request

```bash
curl -X POST "https://YOUR_SPACE.hf.space/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "Ce este Timișoara?"}'
```

## Example Response

```json
{
  "query": "Ce este Timișoara?",
  "answer": "Timișoara este un oraș românesc bogat în atracții turistice...",
  "sources": [
    {
      "rank": 1,
      "score": 0.78,
      "heading": "Istorie",
      "source": "Wikipedia (RO)",
      "snippet": "..."
    }
  ]
}
```

## Tech Stack

- FastAPI
- sentence-transformers (all-MiniLM-L6-v2)
- Qdrant Cloud (vector database)
- HuggingFace Router (text generation)
