"""
Add auto-scraped Revolution '89 chunks to Qdrant.
Reads data/timisoara_revolution_chunks.json produced by auto_scrape_revolution.py
"""

import json
import os
from pathlib import Path
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

# Load environment
ENV_PATH = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = "timisoara_knowledge"
CHUNKS_FILE = Path(__file__).parent.parent / "data" / "timisoara_revolution_chunks.json"

if not QDRANT_URL or not QDRANT_API_KEY:
    raise ValueError("QDRANT_URL and QDRANT_API_KEY not set")


def add_to_qdrant():
    if not CHUNKS_FILE.exists():
        raise FileNotFoundError(f"Chunks file not found: {CHUNKS_FILE}")

    with open(CHUNKS_FILE, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    print(f"🔗 Connecting to Qdrant...")
    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

    print("🤖 Loading embedding model...")
    embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

    try:
        collection_info = client.get_collection(COLLECTION_NAME)
        current_count = collection_info.points_count
        scroll_result = client.scroll(collection_name=COLLECTION_NAME, limit=10000)
        existing_ids = [int(p.id) for p in scroll_result[0]]
        start_id = max(existing_ids) + 1 if existing_ids else 1
        print(f"📊 Current documents: {current_count}")
        print(f"🆔 Starting from ID: {start_id}")
    except Exception as e:
        print(f"⚠️ Could not get collection info: {e}")
        current_count = 0
        start_id = 1

    points = []
    for i, chunk in enumerate(chunks):
        doc_id = start_id + i
        embedding = embedding_model.encode(chunk["text"], convert_to_numpy=True).tolist()
        payload = {
            "text": chunk["text"],
            "heading": chunk["heading"],
            "category": chunk.get("category", "History"),
            "period": chunk.get("period", "1989 Revolution"),
            "source": chunk.get("source", "Visit Timișoara - Revolution '89"),
            "url": chunk.get("url", "https://visit-timisoara.com/timisoara-revolution-89/"),
            "keywords": chunk.get("keywords", []),
        }
        points.append({"id": doc_id, "vector": embedding, "payload": payload})
        print(f"  ✅ {i+1}. {chunk['heading']} (ID: {doc_id})")

    print(f"\n⬆️  Upserting {len(points)} points to Qdrant...")
    client.upsert(collection_name=COLLECTION_NAME, points=points)

    collection_info = client.get_collection(COLLECTION_NAME)
    new_count = collection_info.points_count
    print(f"\n✅ Successfully added {len(points)} chunks!")
    print(f"📊 Total documents in Qdrant: {new_count}")
    print(f"📊 Added: {new_count - current_count} new documents")


if __name__ == "__main__":
    add_to_qdrant()
