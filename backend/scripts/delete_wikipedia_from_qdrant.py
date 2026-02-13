"""
Delete Wikipedia documents from Qdrant, keep only Visit-Timisoara useful info.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from qdrant_client import QdrantClient

# Load environment
ENV_PATH = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COLLECTION_NAME = "timisoara_knowledge"

if not QDRANT_URL or not QDRANT_API_KEY:
    raise ValueError("QDRANT_URL and QDRANT_API_KEY not set")

print("🔗 Connecting to Qdrant...")
client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

# Get current collection info
collection_info = client.get_collection(COLLECTION_NAME)
print(f"📊 Current collection has {collection_info.points_count} points")

# Scroll through all points and delete Wikipedia ones
print("\n🔍 Scanning for Wikipedia documents...")
offset = None
wikipedia_ids = []

while True:
    records, offset = client.scroll(
        collection_name=COLLECTION_NAME,
        limit=100,
        offset=offset,
        with_payload=True,
    )
    
    for record in records:
        source = record.payload.get("source", "")
        if "Wikipedia" in source:
            wikipedia_ids.append(record.id)
            print(f"  Found Wikipedia doc ID {record.id}: {record.payload.get('heading', 'N/A')}")
    
    if offset is None:
        break

print(f"\n📋 Found {len(wikipedia_ids)} Wikipedia documents to delete")

if wikipedia_ids:
    confirm = input(f"🗑️  Delete {len(wikipedia_ids)} Wikipedia documents? (yes/no): ")
    if confirm.lower() == "yes":
        print("\n🗑️  Deleting Wikipedia documents...")
        client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=wikipedia_ids,
        )
        print(f"✅ Deleted {len(wikipedia_ids)} documents!")
        
        # Show new count
        new_info = client.get_collection(COLLECTION_NAME)
        print(f"📊 Collection now has {new_info.points_count} points (Visit-Timisoara only)")
    else:
        print("❌ Deletion cancelled")
else:
    print("✅ No Wikipedia documents found")
