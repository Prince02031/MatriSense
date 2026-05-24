# Admin Vector RAG Debug Panel

## Overview

Lightweight admin/dev visibility for Vector RAG retrieval without changing patient flow.

---

## Backend Endpoint

### POST `/api/admin/vector-rag/preview`

**Purpose:** Debug and inspect vector RAG retrieval for a given decision and symptoms.

**Request Payload:**
```json
{
  "riskLevel": "HIGH",
  "symptoms": ["severe_headache", "blurred_vision"],
  "evidenceTags": ["severe_headache", "blurred_vision"],
  "allowedGuidanceType": "URGENT_ESCALATION",
  "topK": 5
}
```

**Response:**
```json
{
  "ok": true,
  "mode": "hybrid",
  "queryText": "severe headache blurred vision neurological symptoms high risk pregnancy",
  "filtersApplied": {
    "riskLevel": "HIGH",
    "allowedGuidanceType": "URGENT_ESCALATION"
  },
  "retrievedChunks": [
    {
      "sourceId": "source_001",
      "sourceTitle": "WHO Maternal Health Guidelines",
      "sourceKind": "pdf",
      "content": "Blurred vision with headache may indicate preeclampsia...",
      "fullContent": "...",
      "evidenceTags": ["severe_headache", "blurred_vision"],
      "guidanceTypes": ["URGENT_ESCALATION"],
      "audience": "provider",
      "priority": 1,
      "relevanceScore": 0.95,
      "similarityScore": 0.92
    }
  ],
  "rejectedChunks": [
    {
      "sourceId": "source_002",
      "sourceTitle": "Self-Care Tips",
      "reason": "HIGH risk blocks SELF_CARE_AND_MONITOR guidance",
      "content": "Rest and drink water..."
    }
  ],
  "fallbackRecommended": false,
  "warnings": []
}
```

**Error Response (Vector Fails):**
```json
{
  "ok": false,
  "mode": "error",
  "fallbackRecommended": true,
  "warnings": [
    "Vector retrieval failed: API key invalid",
    "Recommend using JSON RAG for this query"
  ],
  "error": "API key invalid"
}
```

---

## Frontend Integration

### Admin AI Explanation Page

**Location:** `frontend/app/admin/ai-explanation/page.jsx`

**What Changed:**
- Added new debug panel: "8a. Vector RAG Debug"
- Shows in the Pipeline Inspector (right panel)
- Displays after running a triage test scenario

**What You See:**
```
8a. Vector RAG Debug
├─ ragMode: "hybrid"
├─ vectorChunksCount: 3
├─ vectorFallbackUsed: false
├─ vectorChunks: [...]
└─ retrievalWarnings: []
```

---

## How to Use

### 1. Access Admin Page
```
Navigate to: http://localhost:3000/admin/ai-explanation
```

### 2. Run a Test Scenario
- Click "HIGH_RISK" preset (or setup custom)
- Follow through the triage flow
- When you reach "final_result", check right panel

### 3. View Vector RAG Data
In the Pipeline Inspector (right side):
- Scroll to **"8a. Vector RAG Debug"**
- Click to expand
- See:
  - `ragMode`: Current RAG mode (json/hybrid/vector)
  - `vectorChunksCount`: Number of vector chunks retrieved
  - `vectorFallbackUsed`: Whether fallback was triggered
  - `vectorChunks`: Full vector chunk data
  - `retrievalWarnings`: Any retrieval errors

### 4. Debug Failures
If vector chunks are empty or fallback is true:
- Check `retrievalWarnings` for error message
- Check if `ragMode` is "json" (might be RAG_MODE=json in .env)
- Check if vector data was ingested (`npm run rag:ingest`)

---

## What Admins Can See

### Vector Retrieval Details
- ✅ Which RAG mode is active (json/hybrid/vector)
- ✅ How many vector chunks were retrieved
- ✅ Each chunk's content (truncated in response)
- ✅ Source information (title, kind, priority)
- ✅ Relevance scores
- ✅ Evidence tags and guidance types
- ✅ Why chunks were rejected (if any)

### Safety Information
- ✅ Risk level enforcement (HIGH blocks self-care)
- ✅ Guidance type filtering (what's allowed)
- ✅ Audience restrictions (patient vs provider)
- ✅ Priority levels

### Error Information
- ✅ Fallback recommendation
- ✅ Retrieval warnings
- ✅ Why vector failed (if it did)

---

## Rules

### What's Protected
- ❌ Patient UI NOT changed
- ❌ Patient data flow NOT modified  
- ❌ Rule engine decisions NOT affected
- ❌ Safety validator NOT bypassed

### Admin Only
- ✅ Only visible in `/admin/ai-explanation`
- ✅ Not visible in patient triage
- ✅ Not visible in patient guidance UI
- ✅ Not exposed in patient API responses

---

## Example: HIGH-Risk Scenario

**Setup:**
```
Risk Level: HIGH
Symptoms: severe_headache, blurred_vision
Guidance Type: URGENT_ESCALATION
```

**Admin Sees:**
```json
{
  "ragMode": "hybrid",
  "vectorChunksCount": 3,
  "vectorFallbackUsed": false,
  "vectorChunks": [
    {
      "sourceTitle": "WHO Guidelines - Pregnancy Complications",
      "content": "Severe headache with visual disturbances may indicate preeclampsia...",
      "relevanceScore": 0.96,
      "guidanceTypes": ["URGENT_ESCALATION"],
      "evidenceTags": ["severe_headache", "blurred_vision"]
    },
    ...
  ],
  "retrievalWarnings": []
}
```

**Patient Sees:**
- Escalation guidance
- Clinical recommendation
- Next steps
- (No debug info)

---

## Troubleshooting

### Vector Chunks Empty
1. Check if `ragMode` is "json"
   - May need `RAG_MODE=hybrid` in .env
2. Check if vector data was ingested
   - Run `npm run rag:ingest`
3. Check if embedding API key is valid
   - Verify `GOOGLE_API_KEY` in .env

### Fallback Always Triggered
1. Check `retrievalWarnings` for error
2. Check server logs for embedding errors
3. Verify API connectivity
4. Check rate limits on embedding service

### Retrieval Seems Slow
- Vector retrieval adds ~800ms
- This is normal for hybrid mode
- JSON-only is much faster (~150ms)

---

## Files Modified

### Backend
- `backend/src/routes/admin.routes.js`
  - Updated `/ai-explanation/test` endpoint to include `vectorRagDebug`
  - Added new `/vector-rag/preview` endpoint

### Frontend
- `frontend/app/admin/ai-explanation/page.jsx`
  - Added "8a. Vector RAG Debug" panel to Pipeline Inspector

---

## API Usage Example

### Using Curl
```bash
curl -X POST http://localhost:3001/api/admin/vector-rag/preview \
  -H "Content-Type: application/json" \
  -d '{
    "riskLevel": "HIGH",
    "symptoms": ["severe_headache", "blurred_vision"],
    "evidenceTags": ["severe_headache", "blurred_vision"],
    "allowedGuidanceType": "URGENT_ESCALATION",
    "topK": 5
  }'
```

### Using JavaScript/Frontend
```javascript
const response = await fetch('/api/admin/vector-rag/preview', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    riskLevel: 'HIGH',
    symptoms: ['severe_headache', 'blurred_vision'],
    evidenceTags: ['severe_headache', 'blurred_vision'],
    allowedGuidanceType: 'URGENT_ESCALATION',
    topK: 5
  })
});

const data = await response.json();
console.log('Vector RAG Results:', data);
```

---

## Summary

✅ **Admin-only visibility** - No patient impact
✅ **Lightweight** - Minimal overhead
✅ **Easy to use** - Just run triage scenario
✅ **Debugging friendly** - Clear error messages
✅ **Production safe** - Doesn't change patient flow

**Quick Start:** Run admin AI explanation test → Check right panel for Vector RAG Debug → See vector chunks and retrieval details!
