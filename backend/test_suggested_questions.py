#!/usr/bin/env python3
"""
Test script for suggested questions feature
Tests the RAG endpoint with LLM-generated follow-up questions
"""

import asyncio
import httpx
import json

# Configuration
BACKEND_URL = "http://localhost:8000"
RAG_ENDPOINT = f"{BACKEND_URL}/api/rag/query"

async def test_suggested_questions():
    """Test the suggested questions feature"""
    
    test_queries = [
        "Ce poduri celebre are Timișoara?",
        "Care sunt serviciile de coworking?",
        "Cum e climatul în Timișoara?",
    ]
    
    async with httpx.AsyncClient() as client:
        for query in test_queries:
            print(f"\n{'='*60}")
            print(f"📝 Query: {query}")
            print('='*60)
            
            try:
                response = await client.post(
                    RAG_ENDPOINT,
                    json={
                        "query": query,
                        "conversation_history": [],
                        "top_k": 5
                    },
                    timeout=60.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    print(f"\n✅ Answer:")
                    print(f"   {data.get('answer', 'N/A')[:150]}...")
                    
                    if data.get('sources'):
                        print(f"\n📚 Sources ({len(data['sources'])}):")
                        for source in data['sources'][:2]:
                            print(f"   • {source.get('heading', 'N/A')}")
                    
                    if data.get('suggested_questions'):
                        print(f"\n💡 Suggested Follow-up Questions ({len(data['suggested_questions'])}):")
                        for i, sq in enumerate(data['suggested_questions'], 1):
                            print(f"   {i}. {sq}")
                    else:
                        print(f"\n⚠️  No suggested questions generated")
                else:
                    print(f"❌ Error: {response.status_code}")
                    print(response.text)
                    
            except Exception as e:
                print(f"❌ Exception: {e}")

if __name__ == "__main__":
    print("🚀 Testing Suggested Questions Feature")
    print("Make sure backend is running on http://localhost:8000")
    asyncio.run(test_suggested_questions())
