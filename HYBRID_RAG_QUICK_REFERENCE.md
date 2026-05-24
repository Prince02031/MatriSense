# Hybrid RAG Integration - Quick Reference Card

## 📋 Files Changed & Created

### Modified (4 files)
```
✏️  backend/src/routes/triage.routes.js
    └─ Line 283: + import hybridRagService
    └─ Line 318: + hybridRetriever parameter

✏️  backend/src/rag/careGuidanceAssembler.js
    └─ Line 138: + hybridRetriever parameter
    └─ Line 348-354: + ragMode, vectorFallbackUsed, retrievalWarnings, vectorChunks

✏️  backend/.env
    └─ + RAG_MODE=json
    └─ + GOOGLE_API_KEY=...

✏️  backend/package.json
    └─ + "rag:hybrid-integration" script
```

### Created (3 files)
```
✨  backend/src/rag/hybridEvidenceRetriever.js (380 lines)
    └─ retrieveEvidenceHybrid()
    └─ convertVectorChunksToCards()
    └─ mergeCardsWithVector()

✨  backend/src/vectorRag/retrieval/hybridRagService.js (100 lines)
    └─ retrieveEvidenceWithMode()
    └─ getRagMode()
    └─ getRagStatus()

✨  backend/src/vectorRag/tests/runHybridRagIntegrationTest.js (400 lines)
    └─ 5 test scenarios
```

---

## 🎛️ Configuration

### Default (Safe)
```env
RAG_MODE=json
```
- Uses JSON cards only
- No vector retrieval
- Fallback mode if vector fails

### Hybrid Mode
```env
RAG_MODE=hybrid
```
- JSON cards + vector chunks
- Falls back to JSON if vector fails
- Enhanced guidance with vector evidence

### Vector Primary
```env
RAG_MODE=vector
```
- Vector chunks first
- JSON fallback if vector fails
- API call required

---

## 🔄 Data Flow

```
Decision
  ↓
Check RAG_MODE
  ↓
┌─json─────────────────────────────┐
│ JSON Cards → Care Context → Response│
└─────────────────────────────────┘

┌─hybrid────────────────────────────────────┐
│ JSON Cards                                │
│        ↓                                  │
│    Merge ← Vector Chunks                 │
│        ↓                                  │
│   Care Context → Response                │
│   (with ragMode metadata)                │
└────────────────────────────────────────┘

┌─vector────────────────────────────────────┐
│ Vector Chunks (primary)                  │
│        ↓                                  │
│    [If fails] → JSON Cards (fallback)   │
│        ↓                                  │
│   Care Context → Response                │
└────────────────────────────────────────┘
```

---

## ✅ Safety Guardrails

| Rule | Status | Enforced By |
|------|--------|-------------|
| Risk level never changes | ✅ Protected | Rule engine controls |
| HIGH risk: no self-care only | ✅ Protected | Evidence retriever guards |
| Low risk: always has warnings | ✅ Protected | Care assembler |
| Forbidden content blocked | ✅ Protected | Safety validator |
| No treatment/procedure/dosage | ✅ Protected | LLM constraints |
| JSON RAG always fallback | ✅ Protected | hybridRagService |

---

## 🧪 Testing

### Integration Test
```bash
npm run rag:hybrid-integration
```

Validates:
1. JSON-only works (baseline)
2. Hybrid merges correctly
3. Risk level unchanged
4. No unsafe LOW-only guidance
5. Deduplication works

### Expected Result
```
✓ Test 1: JSON-only Mode (Baseline)
✓ Test 2: Hybrid Mode with Fallback
✓ Test 3: Risk Level Preservation
✓ Test 4: Guidance Type Filtering
✓ Test 5: Deduplication

Passed: 5, Failed: 0
```

---

## 📊 Care Guidance Context

### New Fields Added
```javascript
{
  // ... existing fields ...
  
  // NEW - Hybrid RAG metadata
  ragMode: 'json' | 'hybrid' | 'vector' | 'json-fallback',
  vectorFallbackUsed: true | false,
  retrievalWarnings: ['warning 1', 'warning 2'],
  vectorChunks: [
    { id, text, sourceId, score },
    ...
  ],
}
```

### How to Use
```javascript
// Check if vector was used
if (!careGuidanceContext.vectorFallbackUsed) {
  // Vector retrieval succeeded
  console.log(`Using ${careGuidanceContext.ragMode} mode`);
  console.log(`Retrieved ${careGuidanceContext.vectorChunks.length} vector chunks`);
}

// Check for warnings
if (careGuidanceContext.retrievalWarnings.length > 0) {
  console.warn('Retrieval warnings:', careGuidanceContext.retrievalWarnings);
}
```

---

## 🚀 Deployment

### Pre-Deployment
```bash
# Verify integration test passes
npm run rag:hybrid-integration

# Verify existing tests still pass
npm run test:e2e:triage
```

### Deployment
```bash
# Ensure RAG_MODE=json in .env (safe default)
# Deploy code
npm start
```

### Post-Deployment
```bash
# Monitor careGuidanceContext.ragMode
# Should be 'json' for all requests
# If any errors, rollback is easy:
# Set RAG_MODE=json, restart
```

---

## 🔧 Troubleshooting

### Problem: "Vector provider failed"
```
Symptom: vectorFallbackUsed=true, ragMode='json-fallback'
Cause: Gemini API quota or rate limit
Fix: Wait and retry, or set RAG_MODE=json
```

### Problem: "Risk level changed unexpectedly"
```
Symptom: HIGH risk became MEDIUM
Cause: Rule engine issue, not RAG
Fix: Check rule engine, not hybrid RAG
```

### Problem: "Low-only self-care appeared in HIGH risk"
```
Symptom: SELF_CARE_AND_MONITOR in HIGH risk patient
Cause: Filtering not applied correctly
Fix: Check careGuidanceAssembler guards
```

### Problem: "Vector chunks are exact duplicates of JSON"
```
Symptom: Same text appears twice
Cause: Deduplication not working
Fix: Check mergeCardsWithVector similarity
```

### Solution: Revert to JSON Only
```bash
# Edit backend/.env
RAG_MODE=json

# Restart
npm start

# Should work immediately
```

---

## 📈 Monitoring Metrics

### Per Request
```javascript
// From careGuidanceContext
const metrics = {
  ragMode: context.ragMode,
  vectorUsed: !context.vectorFallbackUsed,
  vectorChunkCount: context.vectorChunks.length,
  hasWarnings: context.retrievalWarnings.length > 0,
  warningCount: context.retrievalWarnings.length,
};
```

### Aggregated (Over Time)
```
Total Requests: X
  - ragMode='json': X (%) [should be 100% with default]
  - ragMode='hybrid': X (%)
  - ragMode='vector': X (%)
  - ragMode='json-fallback': X (%)

Vector Fallbacks:
  - vectorFallbackUsed=true: X (%)
  - Common warnings: [list of warning types]

Vector Chunks:
  - Average chunks per request: N
  - Max chunks: N
  - Min chunks: 0
```

---

## 🎯 Quick Decision Tree

```
Patient submits triage

↓

Rule engine decides riskLevel

↓

Question: Is RAG_MODE set?
  NO  → Use 'json' (default)
  YES → Use configured mode

↓

Question: Is mode 'json'?
  YES → Retrieve JSON cards only → Done
  NO  → Try vector retrieval

↓

Question: Did vector succeed?
  YES → Merge JSON + vector chunks
  NO  → Fall back to JSON cards

↓

Result → Care context with ragMode metadata

↓

Safety validator checks (final gate)

↓

Patient gets guidance
```

---

## 💡 Key Design Principles

| Principle | Implementation |
|-----------|-----------------|
| **JSON Primary** | Always retrieved first |
| **Vector Supplementary** | Marked as isVectorChunk:true |
| **Mandatory Fallback** | If vector fails, use JSON only |
| **Risk Never Changes** | Vector cannot override riskLevel |
| **Same Guards** | Vector chunks pass same filters as JSON |
| **No Patient Data Change** | Read-only retrieval |
| **Fully Compatible** | Default mode is 'json', zero breaking changes |

---

## 📝 Integration Checklist

### Before Going Live
- [ ] Code reviewed
- [ ] `npm run rag:hybrid-integration` passes
- [ ] `npm run test:e2e:triage` passes
- [ ] Existing patient flow works
- [ ] RAG_MODE=json confirmed in .env

### First 24 Hours
- [ ] Monitor for errors (should be none)
- [ ] Check careGuidanceContext.ragMode (should be 'json')
- [ ] Verify patient guidance quality unchanged

### After 1 Week
- [ ] Confirm no issues
- [ ] Collect metrics on vector retrieval (if enabled later)
- [ ] Plan for gradual rollout of hybrid/vector modes

---

## 🔗 Related Documentation

- `HYBRID_RAG_INTEGRATION.md` - Full technical documentation
- `HYBRID_RAG_SUMMARY.md` - Implementation summary
- `backend/src/rag/hybridEvidenceRetriever.js` - Code implementation
- `backend/src/vectorRag/retrieval/hybridRagService.js` - Mode routing

---

## 📞 Support

### Questions About Integration?
1. Check `HYBRID_RAG_INTEGRATION.md` for detailed flow
2. Review `HYBRID_RAG_SUMMARY.md` for architecture
3. Run `npm run rag:hybrid-integration` to test

### Issues After Deployment?
1. Check `careGuidanceContext.retrievalWarnings`
2. Set `RAG_MODE=json` to verify issue is with vector
3. Review logs for error patterns

### Ready to Enable Vector?
1. Ensure `npm run rag:hybrid-integration` passes
2. Change `RAG_MODE=hybrid` or `vector`
3. Monitor metrics and patient feedback

---

## ✨ Quick Summary

✅ **Vector RAG integrated as optional layer**
✅ **JSON RAG remains primary fallback**
✅ **Rule engine decisions preserved**
✅ **Safety validator is final gate**
✅ **Default mode is json (safe)**
✅ **Can be disabled with one env var**
✅ **Fully tested and documented**

**Start with RAG_MODE=json, zero risk.**
