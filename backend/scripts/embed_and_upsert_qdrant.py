"""
Embed Wikipedia documents and upsert to Qdrant Cloud.
Run this ONCE to populate your vector DB.

Usage:
    python scripts/embed_and_upsert_qdrant.py

Prerequisites:
    - Set QDRANT_URL and QDRANT_API_KEY environment variables
    - Have sentence-transformers installed
"""

import json
import os
from pathlib import Path
from tqdm import tqdm
from dotenv import load_dotenv

from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

# Configuration
DOCS_FILE = Path(__file__).parent.parent / "data" / "documents" / "timisoara_wikipedia.json"
COLLECTION_NAME = "timisoara_knowledge"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # Small, fast, multilingual
VECTOR_SIZE = 384  # Output dimension for all-MiniLM-L6-v2

# Load environment variables from backend/.env
ENV_PATH = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# Qdrant credentials from environment
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

if not QDRANT_URL or not QDRANT_API_KEY:
    raise ValueError(
        "QDRANT_URL and QDRANT_API_KEY environment variables not set. "
        "See QDRANT_SETUP.md for instructions."
    )


def load_documents(docs_file):
    """Load documents from JSON file."""
    with open(docs_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def initialize_client():
    """Initialize Qdrant client."""
    return QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)


def collection_exists(client, collection_name):
    """Check if collection already exists."""
    try:
        client.get_collection(collection_name)
        return True
    except Exception:
        return False


def create_collection(client, collection_name, vector_size):
    """Create a new collection if it doesn't exist."""
    if collection_exists(client, collection_name):
        print(f"✓ Collection '{collection_name}' already exists")
        return

    print(f"Creating collection '{collection_name}'...")
    client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
    )
    print(f"✓ Collection created")


def embed_documents(docs, model_name):
    """Embed documents using SentenceTransformer."""
    print(f"\nLoading embedding model '{model_name}'...")
    model = SentenceTransformer(model_name)

    print(f"Embedding {len(docs)} documents...")
    texts = [doc['text'] for doc in docs]
    embeddings = model.encode(texts, show_progress_bar=True, convert_to_numpy=True)

    return embeddings


def prepare_points(docs, embeddings):
    """Prepare PointStruct objects for Qdrant."""
    points = []
    for i, (doc, embedding) in enumerate(zip(docs, embeddings)):
        point = PointStruct(
            id=i,
            vector=embedding.tolist(),
            payload={
                'doc_id': doc['id'],
                'heading': doc['heading'],
                'text': doc['text'],
                'source': doc['source'],
                'source_url': doc['source_url'],
                'type': doc['type'],
                'language': doc['language'],
                'level': doc['level'],
            }
        )
        points.append(point)
    return points


def upsert_to_qdrant(client, collection_name, points, batch_size=100):
    """Upsert points to Qdrant in batches."""
    print(f"\nUpserting {len(points)} points to Qdrant (batch size: {batch_size})...")

    for i in tqdm(range(0, len(points), batch_size)):
        batch = points[i : i + batch_size]
        client.upsert(collection_name=collection_name, points=batch)

    print(f"✓ All points upserted")


def main():
    print("=" * 70)
    print("EMBEDDING & UPSERTING DOCUMENTS TO QDRANT")
    print("=" * 70)

    # Load documents
    print(f"\n1. LOADING DOCUMENTS")
    print("-" * 70)
    docs = load_documents(DOCS_FILE)
    print(f"✓ Loaded {len(docs)} documents from {DOCS_FILE}")

    # Initialize Qdrant client
    print(f"\n2. CONNECTING TO QDRANT")
    print("-" * 70)
    client = initialize_client()
    print(f"✓ Connected to {QDRANT_URL}")

    # Create collection
    print(f"\n3. CREATING COLLECTION")
    print("-" * 70)
    create_collection(client, COLLECTION_NAME, VECTOR_SIZE)

    # Embed documents
    print(f"\n4. EMBEDDING DOCUMENTS")
    print("-" * 70)
    embeddings = embed_documents(docs, EMBEDDING_MODEL)

    # Prepare points
    print(f"\n5. PREPARING POINTS")
    print("-" * 70)
    points = prepare_points(docs, embeddings)
    print(f"✓ Prepared {len(points)} points")

    # Upsert to Qdrant
    print(f"\n6. UPSERTING TO QDRANT")
    print("-" * 70)
    upsert_to_qdrant(client, COLLECTION_NAME, points, batch_size=100)

    # Summary
    print(f"\n7. SUMMARY")
    print("-" * 70)
    collection_info = client.get_collection(COLLECTION_NAME)
    print(f"Collection: {COLLECTION_NAME}")
    print(f"Total vectors: {collection_info.points_count}")
    print(f"Vector dimension: {collection_info.config.params.vectors.size}")

    print("\n" + "=" * 70)
    print("✓ DONE! Your RAG is ready to query.")
    print("=" * 70)


if __name__ == '__main__':
    main()
