"""
Add Visit-Timisoara useful info to existing Qdrant collection.
"""

import json
import os
from pathlib import Path
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct

# Configuration
DOCS_FILE = Path(__file__).parent.parent / "data" / "visit_timisoara_useful_info.json"
COLLECTION_NAME = "timisoara_knowledge"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# Load environment
ENV_PATH = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")

if not QDRANT_URL or not QDRANT_API_KEY:
    raise ValueError("QDRANT_URL and QDRANT_API_KEY not set")

print("🔧 Loading documents...")
with open(DOCS_FILE, 'r', encoding='utf-8') as f:
    docs = json.load(f)

print(f"📚 Loaded {len(docs)} documents")

print("\n🤖 Loading embedding model...")
model = SentenceTransformer(EMBEDDING_MODEL)

print("🔢 Embedding documents...")
texts = [doc['text'] for doc in docs]
embeddings = model.encode(texts, show_progress_bar=True, convert_to_numpy=True)

print("\n🔗 Connecting to Qdrant...")
client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

# Get current collection size to start IDs from there
collection_info = client.get_collection(COLLECTION_NAME)
start_id = collection_info.points_count
print(f"📊 Current collection has {start_id} points")
print(f"🆕 New documents will start from ID {start_id}")

print("\n📤 Preparing points...")
points = []
for i, (doc, embedding) in enumerate(zip(docs, embeddings)):
    point = PointStruct(
        id=start_id + i,
        vector=embedding.tolist(),
        payload={
            'heading': doc['heading'],
            'text': doc['text'],
            'source': doc['source'],
            'url': doc.get('url', ''),
            'category': doc.get('category', 'general'),
            'type': doc.get('type', 'useful_info'),
        }
    )
    points.append(point)

print(f"📥 Upserting {len(points)} points to Qdrant...")
client.upsert(
    collection_name=COLLECTION_NAME,
    points=points
)

print("\n✅ Done!")
new_collection_info = client.get_collection(COLLECTION_NAME)
print(f"📊 Collection now has {new_collection_info.points_count} total points")
print(f"🎉 Added {len(points)} new useful info documents!")
