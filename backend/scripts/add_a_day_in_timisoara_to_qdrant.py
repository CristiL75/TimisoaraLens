import json
import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct
from sentence_transformers import SentenceTransformer

# Load environment variables
load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = "timisoara_knowledge"

def get_next_id(client):
    """Get the next available ID in the collection"""
    try:
        collection_info = client.get_collection(COLLECTION_NAME)
        return int(collection_info.points_count) + 1
    except Exception as e:
        print(f"[WARNING] Could not get collection count, starting at 1: {e}")
        return 1

def upsert_a_day_in_timisoara_to_qdrant():
    """
    Load chunks from JSON and upsert to Qdrant
    """
    
    # Initialize Qdrant client
    print("[INFO] Connecting to Qdrant...")
    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    
    # Load chunks from JSON
    json_file = "backend/data/a_day_in_timisoara_chunks.json"
    print(f"[INFO] Loading chunks from {json_file}...")
    
    with open(json_file, 'r', encoding='utf-8') as f:
        chunks = json.load(f)
    
    print(f"[INFO] Loaded {len(chunks)} chunks from JSON")
    
    # Load embedding model
    print("[INFO] Loading embedding model all-MiniLM-L6-v2...")
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    
    # Get next available ID
    start_id = get_next_id(client)
    print(f"[INFO] Starting ID: {start_id}")
    
    # Prepare points for upsert
    points = []
    for i, chunk in enumerate(chunks):
        point_id = start_id + i
        
        # Generate embedding
        embedding = embedding_model.encode(chunk["text"], convert_to_numpy=True).tolist()
        
        # Create payload
        payload = {
            "text": chunk["text"],
            "heading": chunk["heading"],
            "category": chunk.get("category", "A day in Timișoara"),
            "period": chunk.get("period", "Contemporary"),
            "source": chunk.get("source", "Visit Timișoara - A day in Timișoara"),
            "url": chunk.get("url", "https://visit-timisoara.com/a-day-in-timisoara/"),
        }
        
        points.append(PointStruct(id=point_id, vector=embedding, payload=payload))
    
    # Upsert to Qdrant
    print(f"[INFO] Upserting {len(points)} points to Qdrant...")
    client.upsert(collection_name=COLLECTION_NAME, points=points)
    
    print(f"[SUCCESS] Upserted {len(points)} chunks to Qdrant!")
    print(f"[INFO] IDs: {start_id} to {start_id + len(chunks) - 1}")

if __name__ == "__main__":
    upsert_a_day_in_timisoara_to_qdrant()
