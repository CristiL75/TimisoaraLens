# Deploy RAG Service to HuggingFace Space

## Step 1: Create HuggingFace Space

1. Go to https://huggingface.co/new-space
2. Fill in:
   - **Name**: `timisoaralens-rag`
   - **License**: MIT
   - **SDK**: Docker
   - **Visibility**: Public (or Private if you prefer)
3. Click **Create Space**

## Step 2: Upload Files

Upload these files from `hf-space-rag/` folder to your new Space:

- `app.py`
- `requirements.txt`
- `Dockerfile`
- `README.md`

You can either:
- **Option A**: Use the web interface (drag & drop files)
- **Option B**: Use Git:
  ```bash
  cd hf-space-rag
  git init
  git remote add origin https://huggingface.co/spaces/YOUR_USERNAME/timisoaralens-rag
  git add .
  git commit -m "Initial RAG service"
  git push origin main
  ```

## Step 3: Configure Secrets

In your Space settings, add these secrets:

1. Click **Settings** tab
2. Scroll to **Repository secrets**
3. Add:
   ```
   QDRANT_URL=https://xxxxx-xxxxx.api.gcp-starter.qdrant.tech
   QDRANT_API_KEY=your_qdrant_api_key
   HF_TOKEN=your_huggingface_token
   HF_MODEL=google/flan-t5-small
   HF_BASE_URL=https://router.huggingface.co/v1
   ```

## Step 4: Wait for Build

HuggingFace will automatically:
1. Build the Docker container (~3-5 minutes)
2. Download model files (~2 minutes first time)
3. Start the service on port 7860

Watch the **Logs** tab for progress.

## Step 5: Test the Space

Once running, your Space URL will be:
```
https://YOUR_USERNAME-timisoaralens-rag.hf.space
```

Test it:
```bash
curl -X POST "https://YOUR_USERNAME-timisoaralens-rag.hf.space/query" \
  -H "Content-Type: application/json" \
  -d '{"query": "Ce este Timișoara?"}'
```

Check docs at:
```
https://YOUR_USERNAME-timisoaralens-rag.hf.space/docs
```

## Step 6: Update Main Backend

Add to your Render backend environment variables:

```
HF_RAG_SPACE_URL=https://YOUR_USERNAME-timisoaralens-rag.hf.space
```

Now your main backend will proxy RAG requests to the HF Space!

## Architecture

```
Mobile App
    ↓
Render Backend (lightweight, /api/rag/query)
    ↓ (proxy via httpx)
HF Space RAG Service
    ↓
Qdrant Cloud (vector search) + HF Router (generation)
    ↓
Response back to Mobile
```

## Benefits

✅ Render backend stays lightweight (~50MB vs ~500MB)  
✅ HF Space has better resources for ML models  
✅ Separate scaling - RAG won't affect main API  
✅ Can update RAG independently  
✅ HF Spaces are free with persistent storage

## Troubleshooting

- **Build fails**: Check Dockerfile and requirements.txt
- **Service crashes**: Check Logs tab, might be memory issue
- **Slow responses**: First query downloads models (~2min), then cached
- **Connection errors**: Verify QDRANT_URL and QDRANT_API_KEY secrets
