import json
import os
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct

# Load environment variables
load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = "timisoara_knowledge"
MODEL_NAME = "all-MiniLM-L6-v2"

def get_next_id(client):
    """Get the next available ID in the collection - ensures no overwrites"""
    collection_info = client.get_collection(COLLECTION_NAME)
    return int(collection_info.points_count) + 1

def add_chunks_to_qdrant(chunks_file):
    """Load chunks from JSON and upsert to Qdrant"""
    
    print("[INFO] Connecting to Qdrant...")
    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    
    print(f"[INFO] Loading chunks from {chunks_file}...")
    with open(chunks_file, "r", encoding="utf-8") as f:
        chunks = json.load(f)
    print(f"[INFO] Loaded {len(chunks)} chunks from JSON")
    
    print(f"[INFO] Loading embedding model {MODEL_NAME}...")
    model = SentenceTransformer(MODEL_NAME)
    
    # Get starting ID
    starting_id = get_next_id(client)
    print(f"[INFO] Starting ID: {starting_id}")
    
    # Create points
    points = []
    for idx, chunk in enumerate(chunks):
        point_id = starting_id + idx
        embedding = model.encode(chunk["text"]).tolist()
        
        point = PointStruct(
            id=point_id,
            vector=embedding,
            payload={
                "text": chunk["text"],
                "heading": chunk["heading"],
                "category": chunk["category"],
                "period": chunk["period"],
                "source": chunk["source"],
                "url": chunk["url"]
            }
        )
        points.append(point)
    
    # Upsert to Qdrant
    print(f"[INFO] Upserting {len(points)} points to Qdrant...")
    client.upsert(
        collection_name=COLLECTION_NAME,
        points=points
    )
    
    end_id = starting_id + len(chunks) - 1
    print(f"[SUCCESS] Upserted {len(chunks)} chunks to Qdrant!")
    print(f"[INFO] IDs: {starting_id} to {end_id}")

if __name__ == "__main__":
    chunks_file = "backend/data/timisoara_for_business_chunks.json"
    add_chunks_to_qdrant(chunks_file)
