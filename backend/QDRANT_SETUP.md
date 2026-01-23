"""
QDRANT CLOUD SETUP GUIDE

Steps to get your RAG working:

1. CREATE QDRANT CLOUD ACCOUNT
   - Go to https://cloud.qdrant.io
   - Sign up (free tier = 1M vectors, 10GB storage)
   - Create a new cluster

2. GET CREDENTIALS
   From Qdrant Cloud dashboard:
   - Copy your CLUSTER URL (e.g., https://xxxxx-xxxxx.qdrant.io)
   - Copy your API KEY

3. SET ENVIRONMENT VARIABLES (in Render or local .env)
   QDRANT_URL=https://xxxxx-xxxxx.qdrant.io
   QDRANT_API_KEY=your-api-key-here

4. RUN EMBEDDING SCRIPT (once, locally or on Render)
   python scripts/embed_and_upsert_qdrant.py

5. DONE!
   Your backend can now call /rag/query endpoint

---

LOCAL TESTING:
1. Create .env in backend/ folder with QDRANT_URL and QDRANT_API_KEY
2. Run: python scripts/embed_and_upsert_qdrant.py
3. Run FastAPI: uvicorn main:app --reload
4. Test: POST /rag/query with {"query": "Ce e Timișoara?"}

"""
