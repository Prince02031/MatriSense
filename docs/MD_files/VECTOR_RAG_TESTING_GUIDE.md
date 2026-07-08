# Vector RAG Testing Guide - Backend & Frontend

## 🔬 Backend Testing

### 1. Integration Test (Automated)

**Run the integration test suite:**
```bash
npm run rag:hybrid-integration
```

**What It Tests:**
- ✅ JSON-only mode baseline
- ✅ Hybrid mode with fallback
- ✅ Risk level preservation (HIGH stays HIGH)
- ✅ Guidance type filtering (no unsafe guidance)
- ✅ Deduplication (no duplicates in merged results)

**Expected Output:**
```
✓ Test 1: JSON-only Mode (Baseline)
✓ Test 2: Hybrid Mode with Fallback
✓ Test 3: Risk Level Preservation
✓ Test 4: Guidance Type Filtering
✓ Test 5: Deduplication

Passed: 5, Failed: 0
```

---

### 2. Manual Backend Testing

#### 2.1 Test With RAG_MODE=json (Default)

**Step 1: Set mode**
```bash
# In backend/.env
RAG_MODE=json
```

**Step 2: Start server**
```bash
npm start
```

**Step 3: Test triage endpoint**
```bash
# PowerShell
$body = @{
    symptoms = @("headache", "blurred vision")
    duration = "2 days"
    severity = "high"
    patientInfo = @{
        age = 28
        isPregnant = $true
        trimester = 2
    }
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3001/api/triage/session/test-123/run" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body

$response | ConvertTo-Json -Depth 10
```

**What to Check in Response:**
```javascript
{
  decision: {
    riskLevel: "HIGH",
    allowedGuidanceType: "URGENT_ESCALATION"
  },
  careGuidanceContext: {
    ragMode: "json",          // ← Should be 'json'
    vectorFallbackUsed: false, // ← Should be false
    retrievedCards: [...],     // ← Should have cards
    vectorChunks: [],          // ← Should be empty
    retrievalWarnings: []      // ← Should be empty
  }
}
```

---

#### 2.2 Test With RAG_MODE=hybrid

**Step 1: Change mode**
```bash
# In backend/.env
RAG_MODE=hybrid
```

**Step 2: Restart server**
```bash
npm start
```

**Step 3: Test same endpoint**
```bash
# Use same curl/PowerShell command as above
```

**What to Check in Response:**
```javascript
{
  decision: {
    riskLevel: "HIGH",
    allowedGuidanceType: "URGENT_ESCALATION"
  },
  careGuidanceContext: {
    ragMode: "hybrid",         // ← Should be 'hybrid'
    vectorFallbackUsed: false, // ← Should be false (vector worked)
    retrievedCards: [...],     // ← Should have cards
    vectorChunks: [...],       // ← Should have vector chunks!
    retrievalWarnings: []      // ← Should be empty if successful
  }
}
```

---

#### 2.3 Test Fallback Behavior (Intentional Vector Failure)

**Step 1: Disable vector to test fallback**
```bash
# In backend/.env
RAG_MODE=hybrid
GOOGLE_API_KEY=invalid_key_to_trigger_fallback
```

**Step 2: Restart and test**
```bash
npm start
# Then run same curl/PowerShell test
```

**What to Check in Response:**
```javascript
{
  careGuidanceContext: {
    ragMode: "json",              // ← Falls back to 'json'!
    vectorFallbackUsed: true,      // ← Fallback triggered
    retrievedCards: [...],         // ← Still has cards (JSON worked)
    vectorChunks: [],              // ← No vector chunks
    retrievalWarnings: [
      "Vector retrieval failed, fell back to JSON RAG"
    ]
  }
}
```

**Important:** No error thrown! System gracefully degrades to JSON RAG.

---

### 3. Console Logging for Debugging

#### 3.1 Add Debug Logs

Check [hybridRagService.js](backend/src/vectorRag/retrieval/hybridRagService.js) for console output:

```javascript
console.log('🔍 RAG Mode:', getRagMode());
console.log('📦 Retrieved Cards:', retrievalResult.retrievedCards.length);
console.log('🤖 Vector Chunks:', retrievalResult.vectorChunks?.length || 0);
console.log('⚠️ Fallback Used:', retrievalResult.vectorFallbackUsed);
```

**Server logs should show:**
```
🔍 RAG Mode: hybrid
📦 Retrieved Cards: 8
🤖 Vector Chunks: 3
⚠️ Fallback Used: false
```

#### 3.2 Check for Errors in Server Logs

**Good signs (no vector):**
```
vector retrieval not enabled (mode: json)
```

**Good signs (vector working):**
```
retrieving vector chunks successfully
merged with deduplication: 3 vector + 8 json = 11 total
```

**Warning signs:**
```
Vector retrieval failed: API key invalid
Falling back to JSON RAG
```

---

### 4. Database/Session Check

**Check stored session data:**
```bash
# View the session data stored
# Location: backend/uploads/sessions/ or database

# Look for careGuidanceContext fields
{
  "sessionId": "test-123",
  "careGuidanceContext": {
    "ragMode": "hybrid",
    "vectorFallbackUsed": false,
    "vectorChunks": [...]
  }
}
```

---

## 🎨 Frontend Testing

### 1. Visual Indicators in Triage Page

The careGuidanceContext is passed to the frontend. Look for:

#### 1.1 RAG Mode Badge (Add to UI)

**What to display:**
```javascript
// In triage page response
careGuidanceContext.ragMode
// values: 'json' | 'hybrid' | 'vector'

// UI Badge:
// 🟢 Green: json (safe default)
// 🟡 Yellow: hybrid (enhanced with vector)
// 🟠 Orange: vector (vector primary)
```

**Example component:**
```jsx
function RagModeBadge({ ragMode }) {
  const colors = {
    json: 'bg-green-100 text-green-800',
    hybrid: 'bg-yellow-100 text-yellow-800',
    vector: 'bg-orange-100 text-orange-800'
  };
  
  return (
    <span className={`px-3 py-1 rounded-full text-sm ${colors[ragMode]}`}>
      RAG Mode: {ragMode.toUpperCase()}
    </span>
  );
}
```

#### 1.2 Vector Chunk Display (Optional)

**Show where vector helped:**
```javascript
// If vectorChunks exist and weren't used from JSON
careGuidanceContext.vectorChunks?.forEach(chunk => {
  console.log('📚 Vector Evidence:', chunk.content);
  console.log('📌 Source:', chunk.source);
  console.log('🎯 Relevance:', chunk.relevanceScore);
});
```

#### 1.3 Fallback Indicator

**Show when fallback was used:**
```javascript
if (careGuidanceContext.vectorFallbackUsed) {
  console.warn('⚠️ Vector RAG failed, using JSON RAG only');
  // Display warning badge to user
}
```

---

### 2. Frontend E2E Testing

#### 2.1 Postman/Rest Client Testing

**Create a Postman collection with these tests:**

**Request 1: Create Session**
```http
POST http://localhost:3001/api/triage/session
Content-Type: application/json

{
  "patientName": "Test Patient",
  "age": 28,
  "isPregnant": true,
  "trimester": 2
}
```

**Expected Response:**
```json
{
  "sessionId": "xyz-123",
  "createdAt": "2026-05-24T..."
}
```

**Request 2: Run Triage (with symptoms)**
```http
POST http://localhost:3001/api/triage/session/xyz-123/run
Content-Type: application/json

{
  "symptoms": ["headache", "blurred vision"],
  "duration": "2 days",
  "severity": "high",
  "onsetTime": "sudden"
}
```

**Expected Response (Check careGuidanceContext):**
```json
{
  "decision": {
    "riskLevel": "HIGH",
    "allowedGuidanceType": "URGENT_ESCALATION"
  },
  "careGuidanceContext": {
    "ragMode": "hybrid",
    "vectorFallbackUsed": false,
    "retrievedCards": [...],
    "vectorChunks": [
      {
        "content": "Blurred vision with headache may indicate...",
        "source": "vector_db",
        "relevanceScore": 0.95
      }
    ],
    "retrievalWarnings": []
  }
}
```

---

#### 2.2 Browser DevTools Testing

**Step 1: Open Network Tab**
- F12 → Network tab
- Filter for XHR requests

**Step 2: Run Triage**
- Go to triage page
- Submit symptoms
- Watch network requests

**Step 3: Check Response**
- Click on `/api/triage/session/.../run` request
- Go to Response tab
- Look for careGuidanceContext fields

**What to verify:**
```javascript
// Response Preview
{
  "careGuidanceContext": {
    "ragMode": "hybrid",              // ✅ Check this
    "vectorFallbackUsed": false,       // ✅ Check this
    "vectorChunks": [...]              // ✅ Should have data in hybrid mode
  }
}
```

---

#### 2.3 Console Logging

**Add to your React component:**
```jsx
useEffect(() => {
  if (careGuidanceContext) {
    console.log('📊 RAG Metadata:', {
      mode: careGuidanceContext.ragMode,
      fallbackUsed: careGuidanceContext.vectorFallbackUsed,
      vectorChunksCount: careGuidanceContext.vectorChunks?.length || 0,
      cardCount: careGuidanceContext.retrievedCards?.length || 0,
      warnings: careGuidanceContext.retrievalWarnings
    });
  }
}, [careGuidanceContext]);
```

**Console output:**
```
📊 RAG Metadata: {
  mode: 'hybrid',
  fallbackUsed: false,
  vectorChunksCount: 3,
  cardCount: 8,
  warnings: []
}
```

---

### 3. Frontend Visual Testing Checklist

#### 3.1 Guidance Display (Should Not Change)

- [ ] Patient sees HIGH-risk guidance for headache+vision
- [ ] Escalation recommendations visible
- [ ] No low-risk self-care shown
- [ ] Warnings displayed prominently
- [ ] Sources cited (cards or vector)

#### 3.2 RAG Mode Changes (With Different Modes)

**Test RAG_MODE=json:**
- [ ] RAG badge shows "JSON"
- [ ] Guidance comes from JSON cards
- [ ] Response time < 1 second
- [ ] No vector chunks shown

**Test RAG_MODE=hybrid:**
- [ ] RAG badge shows "HYBRID"
- [ ] Guidance includes JSON cards
- [ ] Vector chunks displayed (if available)
- [ ] Response time 2-3 seconds
- [ ] All guidance still safe (HIGH risk, no self-care)

**Test RAG_MODE=vector:**
- [ ] RAG badge shows "VECTOR"
- [ ] Vector chunks prioritized
- [ ] JSON fallback if no vector match
- [ ] Response time 2-3 seconds

#### 3.3 Fallback Testing (Simulate Vector Failure)

**Change .env to invalid API key**
```bash
GOOGLE_API_KEY=invalid_key
```

**Test:**
- [ ] Page still loads (no errors)
- [ ] Guidance still displays
- [ ] Warning shown: "Vector retrieval failed, using JSON RAG"
- [ ] Response time quick (JSON only)
- [ ] No patient-facing errors

---

## 📊 Test Matrix

### Backend Modes

| Mode | JSON Cards | Vector Chunks | Speed | Fallback |
|------|-----------|---------------|-------|----------|
| json | ✅ Only | ❌ No | Fast | N/A |
| hybrid | ✅ Yes | ✅ Yes | 2-3s | JSON |
| vector | ✅ Fallback | ✅ Primary | 2-3s | JSON |

### Expected careGuidanceContext by Mode

| Field | json | hybrid | vector |
|-------|------|--------|--------|
| ragMode | "json" | "hybrid" | "vector" |
| vectorFallbackUsed | false | false* | false* |
| retrievedCards | [data] | [data] | [data] |
| vectorChunks | [] | [data]* | [data] |
| retrievalWarnings | [] | []* | []* |

*Can vary based on vector API response

---

## 🐛 Debugging Checklist

### If careGuidanceContext is missing ragMode fields

**Check 1: Is hybridRetriever being passed?**
```javascript
// In triage.routes.js, line ~318
assembleCareGuidanceContext({
  decision,
  caseState,
  knowledgeCards,
  hybridRetriever: retrieveEvidenceWithMode  // ← Should be here
});
```

**Check 2: Is careGuidanceAssembler returning them?**
```javascript
// In careGuidanceAssembler.js, return statement should have:
return {
  ...existingFields,
  ragMode,
  vectorFallbackUsed,
  retrievalWarnings,
  vectorChunks
};
```

### If vector chunks are always empty

**Check 1: Is RAG_MODE set to hybrid/vector?**
```bash
# backend/.env
RAG_MODE=hybrid
```

**Check 2: Is GOOGLE_API_KEY valid?**
```bash
GOOGLE_API_KEY=AIzaSyBJ3DtFZRRYK7kASC4ABJvVqYbA3ZqotEA
```

**Check 3: Do you have vector data?**
- Check if embeddings were generated during initialization
- Check logs for vector ingestion results

### If fallback isn't triggering on error

**Check 1: Is error handling in hybridRagService?**
```javascript
try {
  // retrieve evidence
} catch (error) {
  console.warn('Vector retrieval failed:', error.message);
  return JSON_RAG_RESULT; // ← Should return JSON
}
```

**Check 2: Are errors logged but not shown to user?**
- Check server console for warnings
- Check careGuidanceContext.retrievalWarnings array

---

## 📈 Performance Testing

### Test Response Times

**With RAG_MODE=json:**
```bash
# Should be fast (< 1 second)
time: 234ms
```

**With RAG_MODE=hybrid:**
```bash
# Should be acceptable (2-3 seconds)
json_retrieval: 150ms
vector_retrieval: 800ms
merging: 50ms
total: 1000ms
```

**With RAG_MODE=vector:**
```bash
# Should be acceptable (2-3 seconds)
vector_retrieval: 800ms
json_fallback: 150ms
total: 950ms
```

---

## 🧪 Test Scenarios

### Scenario 1: HIGH-Risk Pregnancy

**Input:**
```json
{
  "symptoms": ["severe headache", "blurred vision", "elevated bp"],
  "severity": "high",
  "isPregnant": true,
  "trimester": 2
}
```

**Expected:**
- riskLevel: "HIGH"
- allowedGuidanceType: "URGENT_ESCALATION"
- careGuidanceContext.ragMode: "hybrid" (if set)
- NO self-care-only guidance
- Escalation warnings prominent

---

### Scenario 2: LOW-Risk Non-Pregnancy

**Input:**
```json
{
  "symptoms": ["mild cough"],
  "severity": "low",
  "isPregnant": false
}
```

**Expected:**
- riskLevel: "LOW"
- allowedGuidanceType: "SELF_CARE_AND_MONITOR"
- careGuidanceContext.ragMode: "hybrid" (if set)
- Can show self-care guidance
- Warnings present but less urgent

---

### Scenario 3: Vector Failure Graceful Degradation

**Input:**
```json
{
  "symptoms": ["symptoms"],
  "RAG_MODE": "hybrid",
  "GOOGLE_API_KEY": "invalid"
}
```

**Expected:**
- No server error
- careGuidanceContext.vectorFallbackUsed: true
- careGuidanceContext.vectorChunks: []
- careGuidanceContext.ragMode: "json"
- Full guidance still returned
- retrievalWarnings shows fallback message

---

## ✅ Sign-Off Checklist

- [ ] Integration test passes: `npm run rag:hybrid-integration`
- [ ] Server starts without errors: `npm start`
- [ ] RAG_MODE=json works (existing behavior)
- [ ] RAG_MODE=hybrid works (with vector)
- [ ] RAG_MODE=vector works (vector primary)
- [ ] Fallback works (invalid API key)
- [ ] Frontend receives careGuidanceContext metadata
- [ ] Risk levels preserved across all modes
- [ ] Safety validator still gates final output
- [ ] No patient data leakage
- [ ] Response times acceptable
- [ ] Guidance quality unchanged or improved

---

## 📞 Quick Test Commands

```bash
# 1. Run integration test
npm run rag:hybrid-integration

# 2. Start server with JSON mode
RAG_MODE=json npm start

# 3. Start server with hybrid mode
RAG_MODE=hybrid npm start

# 4. Test with curl (headache+vision symptoms)
curl -X POST http://localhost:3001/api/triage/session/test-123/run \
  -H "Content-Type: application/json" \
  -d '{
    "symptoms": ["headache", "blurred vision"],
    "severity": "high",
    "duration": "2 days"
  }'

# 5. Check logs in real-time
npm start 2>&1 | grep -i "rag\|vector"

# 6. View careGuidanceContext fields
curl http://localhost:3001/api/triage/session/test-123 | jq '.careGuidanceContext'
```

---

## 🎯 Success Criteria

✅ All integration tests pass
✅ Frontend receives careGuidanceContext metadata
✅ Risk levels never change based on vector
✅ Safety validator still operates
✅ Fallback works gracefully
✅ JSON RAG works as before
✅ Vector chunks optionally enhance guidance
✅ No patient data modified

**Vector RAG is working correctly when all criteria are met! 🎉**
