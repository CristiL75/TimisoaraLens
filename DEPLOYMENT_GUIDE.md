# Deployment Guide - HuggingFace Space RAG

## 📋 Current Setup
- **HF RAG Space URL**: https://latcu-timisoaralens-rag.hf.space
- **GitHub Repo**: https://github.com/CristiL75/TimisoaraLens

## 🚀 Deploy to HF Space

### Step 1: Add HF Space as Git Remote
```bash
# Navigate to your HF Space settings and find the Git URL
# Format: https://huggingface.co/spaces/<username>/<space-name>

# Add remote
git remote add hf https://huggingface.co/spaces/latcu/timisoaralens-rag
```

### Step 2: Push to HF Space
```bash
# Use git credentials or HF token
# Make sure you have HF token configured
git push hf main
```

### Step 3: Update HF Space with Latest Code

1. Go to https://huggingface.co/spaces/latcu/timisoaralens-rag
2. Click "Settings" → "Repository"
3. Verify the linked GitHub repo is set to auto-sync

**OR** manually sync:
```bash
git push hf main --force  # Force sync if needed
```

## 📦 What Gets Deployed

The HF Space will have:
- ✅ Updated `/api/rag.py` with suggested questions function
- ✅ New LLM generation endpoint for questions
- ✅ All Qdrant integration code
- ✅ Test scripts for verification

## 🧪 Testing Suggested Questions

After deployment:
```bash
# Test locally first
python backend/test_suggested_questions.py

# Or curl the HF Space endpoint
curl -X POST https://latcu-timisoaralens-rag.hf.space/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Ce poduri are Timișoara?", "top_k": 5}'
```

## 🔄 Environment Variables on HF Space

Make sure these are set in HF Space Secrets:
- `HF_TOKEN` - Your HuggingFace API token
- `QDRANT_URL` - Qdrant Cloud URL
- `QDRANT_API_KEY` - Qdrant API key
- `HF_RAG_SPACE_URL` - Self-reference (for backend proxy)

## 📝 Notes

- The suggested questions feature uses the same LLM from HF Space
- No additional dependencies needed (using existing setup)
- Feature gracefully degrades if LLM generation fails
- Mobile app will auto-display suggested questions in chatbox

## 🎯 Mobile App Integration

The mobile app already integrated with:
- `SuggestedQuestions.js` component created ✅
- `ChatWidget.js` updated to display suggestions ✅
- Auto-click on suggested questions to populate input ✅

Just rebuild/redeploy mobile app to use new features.
