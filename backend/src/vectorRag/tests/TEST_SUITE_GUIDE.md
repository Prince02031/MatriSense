# Vector RAG Test Suite - Complete Implementation

## Overview

This document describes the comprehensive test suite for the MatriSense Vector RAG system. All tests are designed to validate system functionality **before live integration** with the patient triage flow. No live patient data is modified.

## Test Files Created

### 1. Ingestion Smoke Test
**File:** `backend/src/vectorRag/tests/runIngestionSmokeTest.js`
**npm script:** `npm run rag:smoke`

Tests basic ingestion pipeline functionality:
- **MongoDB Connection:** Validates connection state = 1 (connected)
- **Source Registry:** Loads registry and verifies 18 sources registered
- **Source Records:** Counts VectorKnowledgeSource documents, samples 3 for inspection
- **Chunk Count:** Verifies total chunks > 0 across all sources
- **Chunk Structure:** Validates each chunk has required fields:
  - `sourceId` - Source identifier
  - `text` - Actual chunk content
  - `textHash` - SHA256 hash for deduplication
  - `metadata` - Metadata object with enrichment
- **Metadata Quality:** Analyzes enrichment across chunk sample:
  - `embedding` - 768-dim vector presence
  - `symptoms` - Evidence tags extracted
  - `evidenceTags` - Risk-level tags
  - `riskLevel` - Severity classification

**Expected Output:**
```
✓ MongoDB Connection Test
✓ Source Registry Load Test
✓ Source Records Count Test
✓ Total Chunk Count Test
✓ Chunk Structure Validation Test
✓ Metadata Quality Analysis Test

========== TEST SUMMARY ==========
Passed: 6
Failed: 0
Total:  6
=================================
✓ ALL TESTS PASSED
```

---

### 2. PDF/HTML Extraction Smoke Test
**File:** `backend/src/vectorRag/tests/runPdfHtmlSmokeTest.js`
**npm script:** `npm run rag:pdf-smoke`

Tests adapter extraction capabilities for different source formats:

#### Test Cases

**A. Markdown Extraction (CDC HEAR HER)**
- Loads CDC summary markdown file
- Extracts sections
- Validates warning/urgent content present
- Expected: Multiple sections with maternal warning content

**B. HTML Extraction (CDC HEAR HER HTML)**
- Loads CDC warning signs HTML page
- Extracts meaningful content sections
- Validates > 50 char sections
- Expected: Multiple sections with structured warning content

**C. PDF Extraction (CDC Hear Her PDF)**
- Loads CDC warning signs PDF
- Extracts text via PDF parser
- Validates text content quality
- Expected: Multiple chunks with readable maternal health content

**D. Missing File Handling**
- Attempts to process non-existent PDF
- Validates error is thrown with clear message
- Expected: Error caught, not crash

**E. Large PDF Processing**
- Loads large NCBI high-risk PDF (if available)
- Validates processing completes without crash
- Records processing time
- Expected: Completes in < 30 seconds or times out gracefully

**Outcomes:**
- PDF tests validate adapter implementations work
- Missing file tests ensure error handling
- Large PDF tests ensure scalability
- Skipped tests (⊘) indicate missing source files (expected)

---

### 3. Rule-Aware Vector Retrieval Test
**File:** `backend/src/vectorRag/tests/runRuleAwareVectorRagTest.js`
**npm script:** `npm run rag:retrieval-test`

Tests core retrieval logic with various clinical scenarios. Requires ingested chunks in database.

#### Test Cases (6 Total)

**Test 1: HIGH Risk Headache + Blurred Vision**
```javascript
Decision:  riskLevel=HIGH, symptoms=[severe_headache, blurred_vision]
Expected:  
  - Returns chunks with WARNING_SIGNS guidance
  - Rejects SELF_CARE_ONLY chunks
  - Rejects worker-only sources
  - Validates audience filtering works
```

**Test 2: HIGH Risk Vaginal Bleeding**
```javascript
Decision:  riskLevel=HIGH, symptom=vaginal_bleeding
Expected:
  - Returns URGENT_ESCALATION chunks
  - Returns bleeding-specific chunks
  - Rejects unrelated fever-only content
  - Validates evidence tag matching
```

**Test 3: LOW Risk Mild Nausea**
```javascript
Decision:  riskLevel=LOW, symptom=mild_nausea
Expected:
  - Returns SELF_CARE_AND_MONITOR chunks
  - Includes safety disclaimers
  - Validates risk-level-appropriate guidance
  - Validates audience filtering for PATIENT
```

**Test 4: HEALTH_WORKER Audience Access**
```javascript
Decision:  riskLevel=HIGH, audience=HEALTH_WORKER
Expected:
  - Can access HEALTH_WORKER_REVIEW chunks
  - Can access REFERRAL_WORKFLOW chunks
  - Can access worker-specific sources
  - Validates audience elevation works
```

**Test 5: PATIENT Audience Filtering**
```javascript
Decision:  riskLevel=MEDIUM, audience=PATIENT
Expected:
  - Rejects worker-only sources
  - Rejects worker-specific guidance types
  - Returns only PATIENT-safe content
  - Validates audience restriction works
```

**Test 6: Multiple Symptom Scoring**
```javascript
Decision:  symptoms=[severe_headache, blurred_vision, severe_abdominal_pain]
Expected:
  - Returns multiple matching chunks
  - Chunks sorted by relevance score (descending)
  - Higher-overlap chunks ranked first
  - Validates scoring algorithm
```

**Validation Output Example:**
```
✓ HIGH Risk Headache + Blurred Vision Retrieval
  - Retrieved chunks with WARNING_SIGNS: 3
  - Rejected chunks (guards applied): 2
  
✓ HIGH Risk Vaginal Bleeding Retrieval
  - Retrieved chunks with WARNING_SIGNS: 2
  - Rejected unrelated chunks: 1
  
✓ LOW Risk Mild Nausea Retrieval
  - Self-care guidance available: true
  - Safety disclaimers included: true
  
✓ WORKER Audience Access Control
  - Worker guidance types accessible: true
  
✓ PATIENT Audience Filtering (No Worker Access)
  - Patient-only content filtered correctly: true
  
✓ Multiple Symptom Overlap Scoring
  - Retrieved chunks (sorted): 5
  - Top scores: 0.892 → 0.756
```

---

### 4. Hybrid Fallback Test
**File:** `backend/src/vectorRag/tests/runHybridFallbackTest.js`
**npm script:** `npm run rag:fallback-test`

Tests graceful degradation when embedding provider fails. Mocks provider failures and validates safe fallback.

#### Test Cases (4 Total)

**Test 1: QUOTA_EXHAUSTED Error**
```javascript
Scenario:  EmbeddingClient.embed() throws QUOTA_EXHAUSTED
Expected:
  - No unhandled exception
  - Returns: ok=false, fallbackRecommended=true
  - Error message recorded
  - Mode indicates fallback recommended
```

**Test 2: RATE_LIMITED Error**
```javascript
Scenario:  EmbeddingClient.embed() throws RATE_LIMITED
Expected:
  - No unhandled exception
  - Returns: ok=false, fallbackRecommended=true
  - Error message recorded
  - Indicates quota/rate limit issue
```

**Test 3: Network Error**
```javascript
Scenario:  EmbeddingClient.embed() throws network error
Expected:
  - No unhandled exception
  - Returns: ok=false, fallbackRecommended=true
  - Error message recorded
  - Indicates connectivity issue
```

**Test 4: Graceful Degradation**
```javascript
Scenario:  3 sequential retrieval requests with provider down
Expected:
  - All 3 requests fail gracefully
  - All return: ok=false, fallbackRecommended=true
  - No exceptions thrown
  - Consistent failure handling
  - System remains responsive
```

**Validation Output Example:**
```
✓ Provider Failure: QUOTA_EXHAUSTED
  Gracefully handled: fallbackRecommended=true, ok=false
  - Mode: fallback
  - Error: Quota exhausted

✓ Provider Failure: RATE_LIMITED
  Gracefully handled: fallbackRecommended=true, ok=false
  - Mode: fallback
  - Error: Rate limit exceeded

✓ Provider Failure: NETWORK_ERROR
  Gracefully handled: fallbackRecommended=true, ok=false
  - Mode: fallback
  - Error: Failed to connect to embedding provider

✓ Graceful Degradation (Multiple Failures)
  All 3 failures handled consistently (fallback=true)
  - Failure pattern maintained across retries

========== TEST SUMMARY ==========
Passed:  4
Failed:  0
Total:   4
=================================
✓ ALL FALLBACK TESTS PASSED - Graceful degradation working
```

---

## Test Execution Order

### Phase 1: Validate Ingestion (Run First)
```bash
# Check if ingestion pipeline works and data is in database
npm run rag:smoke
```

Expected: 6/6 tests pass, showing chunks exist and are properly structured.

### Phase 2: Validate Extraction (Run Second)
```bash
# Check if source adapters extract data correctly
npm run rag:pdf-smoke
```

Expected: Multiple extractions successful, missing files reported clearly, no crashes on large files.

### Phase 3: Validate Retrieval (Run Third)
```bash
# Check if retrieval logic respects rules, audiences, risk levels
npm run rag:retrieval-test
```

Expected: 6/6 tests pass, showing retrieval respects all safety rules.

### Phase 4: Validate Fallback (Run Last)
```bash
# Check if system gracefully handles provider failures
npm run rag:fallback-test
```

Expected: 4/4 tests pass, showing system safely degrades when provider fails.

---

## Quick Test All
```bash
# Run all Vector RAG tests in sequence
npm run rag:smoke && npm run rag:pdf-smoke && npm run rag:retrieval-test && npm run rag:fallback-test
```

---

## Integration Checklist

Before integrating Vector RAG into live patient triage:

- [ ] **Pre-Integration Requirements**
  - [ ] Database seeded with ≥1000 chunks from ≥10 sources
  - [ ] All PDF/HTML sources successfully extracted
  - [ ] No adapter crashes on edge cases

- [ ] **Test Phase 1: Ingestion Smoke**
  - [ ] `npm run rag:smoke` → 6/6 pass
  - [ ] MongoDB connection working
  - [ ] Source records exist (≥100 chunks)
  - [ ] Metadata enrichment complete

- [ ] **Test Phase 2: PDF/HTML Extraction**
  - [ ] `npm run rag:pdf-smoke` → majority tests pass
  - [ ] Missing files handled gracefully
  - [ ] Large PDFs don't crash
  - [ ] Content extraction meaningful

- [ ] **Test Phase 3: Retrieval Safety**
  - [ ] `npm run rag:retrieval-test` → 6/6 pass
  - [ ] HIGH risk returns urgent content
  - [ ] LOW risk returns safe content
  - [ ] Audience filtering works (PATIENT vs WORKER)
  - [ ] Multiple symptoms score correctly

- [ ] **Test Phase 4: Fallback Resilience**
  - [ ] `npm run rag:fallback-test` → 4/4 pass
  - [ ] Provider failures don't crash system
  - [ ] `fallbackRecommended=true` when provider down
  - [ ] No unhandled exceptions
  - [ ] Graceful degradation consistent

- [ ] **Live Integration**
  - [ ] Call `ruleAwareVectorRetriever.retrieve()` from decisionBuilder
  - [ ] Use `fallbackRecommended` to trigger JSON RAG fallback
  - [ ] Monitor embedding API quota usage
  - [ ] Log retrieval metrics for analysis

---

## Architecture Overview

### Test Scope (NOT Modified)

✅ **Preserved - Active Production Code**
- Rule engine (`src/rules/`)
- Decision builder (`src/services/decisionBuilder.js`)
- Safety validator (`src/safety/validator.js`)
- Patient result formatter
- Existing JSON RAG fallback

### Test Targets (NEW - Test Only)

🔄 **New Components - Under Test**
- Ingestion pipeline (`src/vectorRag/ingestion/`)
- PDF/HTML adapters (`src/vectorRag/adapters/`)
- Domain layer (`src/vectorRag/domain/`)
- Retrieval layer (`src/vectorRag/retrieval/`)
- Embedding provider integration

### Test Data

📊 **Test Database**
- Separate test collections if possible
- Or use `--dry-run` for non-destructive testing
- No modification of production patient data
- Ingestion only, no deletions

---

## Debugging Test Failures

### Ingestion Test Failures

**Issue:** "MongoDB Connection Test" fails
- **Cause:** MongoDB not running or MONGODB_URI incorrect
- **Fix:** Check `.env` MONGODB_URI, verify MongoDB is running

**Issue:** "No chunks found"
- **Cause:** Ingestion not run yet
- **Fix:** Run `npm run rag:ingest` first

**Issue:** "Metadata quality low"
- **Cause:** Embedding provider quota exceeded
- **Fix:** Check Google Gemini API quota, wait before retry

### PDF/HTML Test Failures

**Issue:** "File not found"
- **Cause:** Source documents not downloaded
- **Fix:** Normal behavior, not a failure (marked as ⊘)

**Issue:** "No text extracted"
- **Cause:** PDF parser unable to read file
- **Fix:** PDF may require OCR, check PDF format

### Retrieval Test Failures

**Issue:** "No chunks retrieved"
- **Cause:** Ingestion smoke test didn't pass
- **Fix:** Run ingestion smoke test first

**Issue:** "Chunks retrieved but guards rejected all"
- **Cause:** Audience filtering too strict
- **Fix:** Verify metadata.audiences matches decision audience

### Fallback Test Failures

**Issue:** "Error was thrown"
- **Cause:** Fallback not catching provider errors
- **Fix:** Review `ruleAwareVectorRetriever.retrieve()` error handling

**Issue:** "Unexpected result"
- **Cause:** Mock not applied correctly
- **Fix:** Verify EmbeddingClient.prototype.embed mocking

---

## Performance Benchmarks

For reference when running tests:

| Test | Expected Time | Notes |
|------|---------------|-------|
| Ingestion Smoke | 2-5 sec | DB queries only |
| PDF/HTML Smoke | 10-30 sec | File I/O, adapter processing |
| Retrieval Test | 30-60 sec | Includes 6 embedding calls |
| Fallback Test | 10-20 sec | Mock provider failures |
| **Total Suite** | **60-120 sec** | Full validation |

---

## Next Steps After Passing Tests

1. **Monitor Live Ingestion**
   - Run `npm run rag:ingest` on full source set
   - Monitor for adapter errors
   - Verify chunk count vs source size

2. **Monitor Retrieval Quality**
   - Log retrieval requests → logged decisions
   - Analyze chunk relevance vs decision
   - Tune scoring/filtering as needed

3. **Monitor Provider Reliability**
   - Track API quota usage
   - Monitor fallback recommendation rate
   - Alert if > 10% of requests need fallback

4. **Live Integration**
   - Add retrieval call to decisionBuilder
   - Use fallback when retrieval fails
   - Monitor patient triage outcomes

---

## Test Architecture

### Ingestion Smoke Test Structure
```javascript
class IngestionSmokeTest {
  async run() {
    // 1. Connect to MongoDB
    // 2. Run 6 sequential tests
    // 3. Report pass/fail for each
    // 4. Exit with code 0 (pass) or 1 (fail)
  }
}
```

### PDF/HTML Smoke Test Structure
```javascript
class PdfHtmlSmokeTest {
  async run() {
    // 1. Test markdown extraction
    // 2. Test HTML extraction
    // 3. Test PDF extraction
    // 4. Test missing file handling
    // 5. Test large file handling
    // 6. Report results
  }
}
```

### Retrieval Test Structure
```javascript
class RuleAwareVectorRagTest {
  async run() {
    // 1. Connect to MongoDB
    // 2. Initialize embedding client
    // 3. Run 6 retrieval scenarios
    // 4. Validate results against expectations
    // 5. Report pass/fail for each
  }
}
```

### Fallback Test Structure
```javascript
class HybridFallbackTest {
  async run() {
    // 1. Connect to MongoDB
    // 2. Mock embedding provider failures
    // 3. Run 4 failure scenarios
    // 4. Validate graceful degradation
    // 5. Report pass/fail for each
  }
}
```

---

## Files Added This Phase

### Test Files (4)
1. `backend/src/vectorRag/tests/runIngestionSmokeTest.js` - 260 lines
2. `backend/src/vectorRag/tests/runPdfHtmlSmokeTest.js` - 270 lines
3. `backend/src/vectorRag/tests/runRuleAwareVectorRagTest.js` - 420 lines
4. `backend/src/vectorRag/tests/runHybridFallbackTest.js` - 380 lines

### Scripts Added (4)
- `npm run rag:smoke` - Ingestion smoke test
- `npm run rag:pdf-smoke` - PDF/HTML extraction test
- `npm run rag:retrieval-test` - Retrieval logic test (6 scenarios)
- `npm run rag:fallback-test` - Provider failure fallback test

### Documentation
- This file: `backend/src/vectorRag/tests/TEST_SUITE_GUIDE.md`

---

## Summary

**Complete test suite created with:**
- ✅ 4 comprehensive test files
- ✅ 4 npm scripts for easy execution
- ✅ 16 individual test cases (smoke + retrieval + fallback)
- ✅ Covers ingestion, extraction, retrieval, and resilience
- ✅ No live patient data modified
- ✅ No production code changed
- ✅ Ready for validation before live integration

**Ready to execute:**
```bash
npm run rag:smoke          # Basic ingestion validation
npm run rag:pdf-smoke      # PDF/HTML extraction validation
npm run rag:retrieval-test # Core retrieval safety validation (6 scenarios)
npm run rag:fallback-test  # Provider failure graceful degradation
```

**All tests pass before live integration.**
