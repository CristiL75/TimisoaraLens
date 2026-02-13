"""
Upsert Timișoara Firsts documents to Qdrant vector database
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
FIRSTS_FILE = Path(__file__).parent.parent / "data" / "timisoara_firsts.json"

if not QDRANT_URL or not QDRANT_API_KEY:
    raise ValueError("QDRANT_URL and QDRANT_API_KEY not set in .env file")

def load_firsts():
    """Load extracted firsts from JSON file"""
    if not FIRSTS_FILE.exists():
        raise FileNotFoundError(f"Firsts file not found: {FIRSTS_FILE}")
    
    with open(FIRSTS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def upsert_firsts():
    """Upsert firsts to Qdrant"""
    firsts = load_firsts()
    
    if not firsts:
        print("[ERROR] No firsts to upsert")
        return False
    
    print(f"[INFO] Loaded {len(firsts)} firsts from JSON")
    
    print(f"🔗 Connecting to Qdrant...")
    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    
    # Get current collection state to determine starting ID
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
        start_id = 1000  # Start at 1000 for firsts
    
    # Load embedding model
    print(f"🤖 Loading embedding model...")
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    
    # Prepare points
    points = []
    for i, first in enumerate(firsts):
        doc_id = start_id + i
        text = f"{first['title']} {first['content']}"
        embedding = embedding_model.encode(text, convert_to_numpy=True).tolist()
        payload = {
            "title": first["title"],
            "content": first["content"],
            "source": first["source"],
            "category": "Firsts"
        }
        points.append({"id": doc_id, "vector": embedding, "payload": payload})
        print(f"  ✅ {i+1}. {first['title'][:50]}... (ID: {doc_id})")
    
    # Upsert to Qdrant
    try:
        print(f"\n⬆️  Upserting {len(points)} points to Qdrant...")
        client.upsert(collection_name=COLLECTION_NAME, points=points)
        
        collection_info = client.get_collection(COLLECTION_NAME)
        new_count = collection_info.points_count
        print(f"\n✅ Successfully added {len(points)} firsts!")
        print(f"📊 Total documents in Qdrant: {new_count}")
        print(f"📊 Added: {new_count - current_count} new documents")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to upsert: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    try:
        success = upsert_firsts()
        exit(0 if success else 1)
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        exit(1)
