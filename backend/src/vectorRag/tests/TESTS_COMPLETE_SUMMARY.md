# Vector RAG Test Suite - Implementation Summary

**Status:** ✅ COMPLETE - All 4 test files created + npm scripts configured

## Quick Reference

| Test | File | npm Script | Purpose | Test Cases |
|------|------|-----------|---------|-----------|
| Ingestion | `runIngestionSmokeTest.js` | `rag:smoke` | Database & ingestion validation | 6 |
| PDF/HTML | `runPdfHtmlSmokeTest.js` | `rag:pdf-smoke` | Source extraction validation | 5 |
| Retrieval | `runRuleAwareVectorRagTest.js` | `rag:retrieval-test` | Safety & retrieval logic (6 scenarios) | 6 |
| Fallback | `runHybridFallbackTest.js` | `rag:fallback-test` | Provider failure graceful degradation | 4 |

**Total:** 4 files, 21 test cases, 4 npm scripts

---

## Execution Guide

### Quick All-Tests
```bash
cd backend
npm run rag:smoke && npm run rag:pdf-smoke && npm run rag:retrieval-test && npm run rag:fallback-test
```

### Individual Tests
```bash
npm run rag:smoke             # Test ingestion pipeline (6 tests)
npm run rag:pdf-smoke         # Test PDF/HTML extraction (5 tests)
npm run rag:retrieval-test    # Test retrieval logic (6 scenarios)
npm run rag:fallback-test     # Test provider failure handling (4 tests)
```

---

## Test Details

### Test 1: Ingestion Smoke (260 lines)
**File:** `backend/src/vectorRag/tests/runIngestionSmokeTest.js`
**Command:** `npm run rag:smoke`

Tests database and ingestion output:
1. MongoDB connection state (expect: connected)
2. Source registry loaded (expect: 18 sources)
3. Source records in DB (expect: > 0)
4. Total chunks in DB (expect: > 0)
5. Chunk structure valid (expect: sourceId, text, textHash, metadata)
6. Metadata enrichment complete (expect: embedding, symptoms, evidenceTags, riskLevel)

**Expected Output:** 6 tests pass

---

### Test 2: PDF/HTML Extraction (270 lines)
**File:** `backend/src/vectorRag/tests/runPdfHtmlSmokeTest.js`
**Command:** `npm run rag:pdf-smoke`

Tests adapter extraction from different source formats:
1. Markdown extraction - CDC HEAR HER summary
2. HTML extraction - CDC warning signs page
3. PDF extraction - CDC warning signs PDF
4. Missing file handling - graceful error
5. Large PDF handling - no crash, reasonable time

**Expected Output:** 3-5 tests pass (missing files = skipped, not failed)

---

### Test 3: Rule-Aware Retrieval (420 lines)
**File:** `backend/src/vectorRag/tests/runRuleAwareVectorRagTest.js`
**Command:** `npm run rag:retrieval-test`

Tests retrieval logic with 6 clinical scenarios:

1. **HIGH Risk: Headache + Blurred Vision**
   - ✓ Returns WARNING_SIGNS chunks
   - ✓ Rejects SELF_CARE_ONLY
   - ✓ Rejects worker-only sources

2. **HIGH Risk: Vaginal Bleeding**
   - ✓ Returns URGENT_ESCALATION chunks
   - ✓ Returns bleeding-specific content
   - ✓ Rejects unrelated content

3. **LOW Risk: Mild Nausea**
   - ✓ Returns SELF_CARE_AND_MONITOR chunks
   - ✓ Includes safety disclaimers
   - ✓ Risk-level appropriate

4. **HEALTH_WORKER Audience**
   - ✓ Accesses HEALTH_WORKER_REVIEW chunks
   - ✓ Accesses REFERRAL_WORKFLOW chunks
   - ✓ Accesses worker sources

5. **PATIENT Audience (Filtering)**
   - ✓ Rejects worker-only sources
   - ✓ Rejects worker guidance types
   - ✓ Returns PATIENT-safe content only

6. **Multiple Symptom Scoring**
   - ✓ Returns multiple chunks
   - ✓ Sorted by relevance score (descending)
   - ✓ Highest-overlap ranked first

**Expected Output:** 6 tests pass (or warn if database empty)

---

### Test 4: Hybrid Fallback (380 lines)
**File:** `backend/src/vectorRag/tests/runHybridFallbackTest.js`
**Command:** `npm run rag:fallback-test`

Tests graceful degradation when embedding provider fails:

1. **QUOTA_EXHAUSTED Error**
   - ✓ No unhandled exception
   - ✓ Returns ok=false, fallbackRecommended=true

2. **RATE_LIMITED Error**
   - ✓ No unhandled exception
   - ✓ Returns ok=false, fallbackRecommended=true

3. **Network Error**
   - ✓ No unhandled exception
   - ✓ Returns ok=false, fallbackRecommended=true

4. **Graceful Degradation (Multiple Failures)**
   - ✓ 3 sequential failures all handled safely
   - ✓ Consistent fallback state
   - ✓ System remains responsive

**Expected Output:** 4 tests pass

---

## Architecture Integration

### What Tests DO
- ✅ Validate ingestion pipeline works
- ✅ Validate adapters extract data correctly
- ✅ Validate retrieval respects safety rules
- ✅ Validate system handles provider failures gracefully
- ✅ Use test database collections
- ✅ Do NOT modify production data

### What Tests DON'T DO
- ❌ Modify live patient records
- ❌ Change rule engine behavior
- ❌ Modify safety validator
- ❌ Change existing JSON RAG fallback
- ❌ Integrate with triage flow (yet)

---

## Pre-Integration Validation Checklist

Before adding retrieval to live triage flow:

### Phase 1: Ingestion
- [ ] `npm run rag:smoke` returns 6/6 pass
- [ ] Database has ≥ 100 chunks
- [ ] Metadata enrichment complete
- [ ] No MongoDB connection errors

### Phase 2: Extraction
- [ ] `npm run rag:pdf-smoke` returns ≥3 passes
- [ ] Missing files reported clearly (not crashes)
- [ ] Large PDFs complete without timeout
- [ ] Content extraction is meaningful

### Phase 3: Retrieval
- [ ] `npm run rag:retrieval-test` returns 6/6 pass
- [ ] HIGH risk returns urgent content
- [ ] LOW risk returns safe content
- [ ] Audience filtering works (PATIENT ≠ WORKER)
- [ ] Multiple symptoms score correctly

### Phase 4: Resilience
- [ ] `npm run rag:fallback-test` returns 4/4 pass
- [ ] Provider failures don't crash
- [ ] Graceful degradation working
- [ ] Fallback recommendation set properly

### Live Integration
- [ ] Call `ruleAwareVectorRetriever.retrieve()` from decisionBuilder
- [ ] Check `retrieval.fallbackRecommended` flag
- [ ] Use JSON RAG fallback when true
- [ ] Monitor retrieval metrics

---

## File Locations

```
backend/src/vectorRag/tests/
├── runIngestionSmokeTest.js       (260 lines) ✅ Created
├── runPdfHtmlSmokeTest.js         (270 lines) ✅ Created
├── runRuleAwareVectorRagTest.js   (420 lines) ✅ Created
├── runHybridFallbackTest.js       (380 lines) ✅ Created
└── TEST_SUITE_GUIDE.md            (comprehensive guide)
```

---

## npm Scripts Added to package.json

```json
{
  "scripts": {
    "rag:smoke": "node src/vectorRag/tests/runIngestionSmokeTest.js",
    "rag:pdf-smoke": "node src/vectorRag/tests/runPdfHtmlSmokeTest.js",
    "rag:retrieval-test": "node src/vectorRag/tests/runRuleAwareVectorRagTest.js",
    "rag:fallback-test": "node src/vectorRag/tests/runHybridFallbackTest.js"
  }
}
```

---

## Test Execution Time

| Test | Time | Notes |
|------|------|-------|
| Ingestion Smoke | 2-5 sec | DB queries only |
| PDF/HTML Smoke | 10-30 sec | File I/O + parsing |
| Retrieval Test | 30-60 sec | 6 scenarios + embedding |
| Fallback Test | 10-20 sec | Mock provider failures |
| **Total** | **60-120 sec** | Full suite |

---

## Debugging Tips

### Test Fails at Connection
```
Cause: MongoDB not running
Fix: Start MongoDB, check MONGODB_URI in .env
```

### Retrieval Test Returns No Chunks
```
Cause: Ingestion smoke test failed or no ingestion run
Fix: Run 'npm run rag:smoke' first, then 'npm run rag:ingest'
```

### PDF/HTML Test Shows Missing Files
```
Cause: Source documents not downloaded
Fix: Normal - these tests gracefully skip (marked ⊘)
```

### Fallback Test Throws Exception
```
Cause: Error not caught in retriever
Fix: Review ruleAwareVectorRetriever.retrieve() error handling
```

---

## Success Criteria

✅ **Test Suite Ready When:**
1. All 4 test files created and executable
2. All 4 npm scripts working
3. Ingestion smoke test passes 6/6
4. Retrieval test can run (passes if DB populated)
5. Fallback test passes 4/4
6. Total execution < 120 seconds
7. Documentation complete

✅ **System Ready for Live Integration When:**
1. All above criteria met
2. Plus: Manual review of test results
3. Plus: Confidence in retrieval quality
4. Plus: Provider failure handling verified

---

## Next Phase: Live Integration

Once all tests pass:

1. **Update decisionBuilder.js**
   - Import ruleAwareVectorRetriever
   - Call after rule evaluation
   - Handle fallbackRecommended flag

2. **Monitor Metrics**
   - Retrieval success rate
   - Provider error rate
   - Fallback activation frequency
   - Chunk relevance vs decision

3. **Iterate**
   - Tune scoring weights if needed
   - Adjust guard thresholds
   - Monitor patient outcomes
   - Log retrieval decisions

---

## Summary

**Complete test suite implemented with:**
- 4 test files (1,330 lines total code)
- 21 individual test cases
- 4 npm scripts
- Comprehensive documentation
- Pre-integration validation checklist
- Ready for execution

**Status: Ready to test**

Execute tests:
```bash
cd backend
npm run rag:smoke && npm run rag:pdf-smoke && npm run rag:retrieval-test && npm run rag:fallback-test
```

All tests must pass before live integration.
