"""
Add Timișoara Today chunks to Qdrant
Embeds and upserts optimized chunks from scrape_timisoara_today.py
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer
from scrape_timisoara_today import get_timisoara_today_chunks

# Load environment
ENV_PATH = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# Qdrant configuration
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = "timisoara_knowledge"

if not QDRANT_URL or not QDRANT_API_KEY:
    raise ValueError("QDRANT_URL and QDRANT_API_KEY not set")


def add_to_qdrant():
    """Embed and upsert Timișoara Today chunks to Qdrant."""
    
    # Initialize
    print("🔗 Connecting to Qdrant...")
    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    
    print("🤖 Loading embedding model...")
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    
    # Get current max ID in Qdrant
    try:
        collection_info = client.get_collection(COLLECTION_NAME)
        current_count = collection_info.points_count
        print(f"📊 Current documents in Qdrant: {current_count}")
        
        # Get all points to find max ID
        scroll_result = client.scroll(
            collection_name=COLLECTION_NAME,
            limit=10000,
        )
        existing_ids = [int(point.id) for point in scroll_result[0]]
        start_id = max(existing_ids) + 1 if existing_ids else 1
        print(f"🆔 Starting from ID: {start_id}")
        
    except Exception as e:
        print(f"⚠️  Could not get collection info: {e}")
        start_id = 1
    
    # Get chunks
    chunks = get_timisoara_today_chunks()
    print(f"\n📝 Processing {len(chunks)} chunks from Timișoara Today...")
    
    # Prepare points for upsert
    points = []
    for i, chunk in enumerate(chunks):
        doc_id = start_id + i
        
        # Embed text
        text = chunk['text']
        embedding = embedding_model.encode(text, convert_to_numpy=True).tolist()
        
        # Prepare payload
        payload = {
            "text": text,
            "heading": chunk['heading'],
            "category": chunk['category'],
            "source": chunk['source'],
            "url": chunk['url'],
            "keywords": chunk['keywords'],
        }
        
        points.append({
            "id": doc_id,
            "vector": embedding,
            "payload": payload
        })
        
        print(f"  ✅ {i+1}. {chunk['heading']} (ID: {doc_id})")
    
    # Upsert to Qdrant
    print(f"\n⬆️  Upserting {len(points)} points to Qdrant...")
    client.upsert(
        collection_name=COLLECTION_NAME,
        points=points
    )
    
    # Verify
    collection_info = client.get_collection(COLLECTION_NAME)
    new_count = collection_info.points_count
    
    print(f"\n✅ Successfully added {len(points)} chunks!")
    print(f"📊 Total documents in Qdrant: {new_count}")
    print(f"📊 Added: {new_count - current_count} new documents")
    
    print("\n🎯 Chunks by category:")
    categories = {}
    for chunk in chunks:
        cat = chunk['category']
        categories[cat] = categories.get(cat, 0) + 1
    
    for cat, count in sorted(categories.items()):
        print(f"   {cat}: {count} chunks")


if __name__ == "__main__":
    add_to_qdrant()
