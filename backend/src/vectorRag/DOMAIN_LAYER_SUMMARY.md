# MatriSense Vector RAG Domain Layer - Implementation Summary

## Files Created (7 Total)

### Domain Layer (5 files in `backend/src/vectorRag/domain/matrisense/`)

1. **maternalKeywordMap.js** (406 lines)
   - Maps 14 maternal health conditions to keywords (English + Bengali)
   - Conditions: vaginal_bleeding, convulsion, severe_headache, blurred_vision, severe_abdominal_pain, fever, severe_weakness, difficulty_breathing, severe_vomiting, reduced_fetal_movement, dizziness, swelling, chest_pain, self_harm_thoughts
   - Each condition has: riskLevel, evidenceTags, keyword variants
   - Functions: extractKeywordsFromText(), getConditionMetadata(), getConditionsFromSymptoms()

2. **matrisenseMetadataPolicy.js** (158 lines)
   - Merges registry defaultMetadata with adapter metadata
   - Enriches chunks with detected symptoms/evidence tags via keyword matching
   - Enforces audience restrictions (PATIENT vs HEALTH_WORKER vs ADMIN/DOCS)
   - Prevents patient-unsafe content from worker/docs-only sources
   - Validates metadata quality and provides summaries for logging

3. **guidanceTypePolicy.js** (239 lines)
   - Restricts guidance types by audience
   - Patient-safe: URGENT_ESCALATION, CONTACT_HEALTH_WORKER, SELF_CARE_AND_MONITOR, WARNING_SIGNS, SAFETY_DISCLAIMER, FOLLOW_UP_QUESTION
   - Health worker adds: HEALTH_WORKER_REVIEW, REFERRAL_WORKFLOW, FACILITY_READINESS
   - Admin/Docs only: SYSTEM_CONTEXT, DIGITAL_HEALTH_ARCHITECTURE
   - Functions: isGuidanceTypeAllowedForAudience(), filterGuidanceTypesForAudience(), recommendGuidanceTypesForRiskLevel()

4. **buildRuleAwareQuery.js** (246 lines)
   - Builds embedding query from decision context, NOT raw patient text
   - Input: decision (riskLevel, evidenceTags, allowedGuidanceType, matchedRuleName) + caseState + symptoms
   - Output: queryText + riskLevel + evidenceTags + allowedGuidanceTypes + confidence + components
   - Combines risk context + evidence tags + confirmed symptoms + rule context
   - Confidence score (0-1) reflects evidence availability

5. **retrievalGuards.js** (415 lines)
   - Safety filters for vector retrieval results
   - 6 guard functions:
     - Risk level: HIGH risk rejects LOW-only SELF_CARE_AND_MONITOR
     - Audience: Rejects worker/docs-only chunks for PATIENT audience
     - Guidance type: Rejects incompatible guidance types
     - Safety content: Rejects treatment/dosage/procedure content for PATIENT
     - Evidence tag overlap: Preference scoring
     - Symptom overlap: Preference scoring
   - evaluateChunk() returns: allowed status + score (0-1) + reasons + issues
   - filterChunksThroughGuards() separates accepted (sorted by score) + rejected

### Retrieval Layer (2 files in `backend/src/vectorRag/retrieval/`)

6. **vectorSearch.js** (189 lines)
   - MongoDB vector search with metadata filtering
   - buildVectorSearchPipeline(): Creates $search aggregation stage
   - buildFilterCondition(): Constructs MongoDB $match conditions from filter object
   - Supports filters: sourceId, sourceKind, audience, riskLevel, evidenceTags, symptoms, trusted, language, textHashExclude
   - Functions: vectorSearch(), searchByTextHash(), searchByChunkId(), searchBySourceId()

7. **ruleAwareVectorRetriever.js** (259 lines)
   - Main orchestrator for rule-aware retrieval
   - retrieveRuleAware(config) orchestrates:
     1. Validate inputs (decision required)
     2. Build rule-aware query via buildRuleAwareQuery()
     3. Embed query via embeddingClient
     4. Handle embedding failures gracefully (quota/rate-limit → fallbackRecommended=true)
     5. Build metadata filters from query context
     6. Execute vector search
     7. Apply retrieval guards to filter results
   - Return object:
     - ok: success status
     - mode: 'rule-aware' | 'fallback' | 'error'
     - queryText: embedded text
     - filtersApplied: metadata filters used
     - retrievedChunks: accepted chunks with scores (sorted)
     - rejectedChunks: rejected chunks with reasons
     - totalRetrieved / totalRejected: counts
     - warnings: array of warnings
     - fallbackRecommended: boolean
     - error: error message if ok=false

## Metadata Enrichment Flow

```
Registry Entry (sourceRegistry.json)
  ↓ (audiences, allowedGuidanceTypes, defaultMetadata)
  
Adapter Output (from knowledgeCardAdapter, markdownAdapter, etc.)
  ↓ (sourceId, text, basic metadata)
  
mergeRegistryAndAdapterMetadata()
  ↓ (preserves registry restrictions)
  
Chunk Document
  ↓ (stored in MongoDB)
  
enrichMetadataWithSymptoms(chunkText)
  ↓ (extract keywords, detect conditions)
  
Enriched Metadata
  {
    sourceId, sourceKind, language
    riskLevel, detectedRiskLevel
    symptoms: [vaginal_bleeding, convulsion, ...]
    evidenceTags: [WHO_PREGNANCY_DANGER_SIGNS, ...]
    allowedAudiences: [PATIENT, HEALTH_WORKER]
    allowedGuidanceTypes: [URGENT_ESCALATION, ...]
    patientRestricted: false
    trusted: true
  }
```

## Patient vs Worker Audience Filtering

### PATIENT Audience
✅ **Allowed sources:**
- KnowledgeCards (priority 1)
- WHO/CDC danger signs summaries (priority 2)
- DGHS Bangladesh counselling (priority 2)

❌ **Rejected sources:**
- WHO digital kit (restrictedPatientContext)
- NCBI clinical references (patientRestricted)
- Facility readiness checklists (patientRestricted)
- Government policy documents (patientRestricted)

✅ **Allowed guidance types:**
- URGENT_ESCALATION, CONTACT_HEALTH_WORKER
- SELF_CARE_AND_MONITOR, WARNING_SIGNS
- SAFETY_DISCLAIMER, FOLLOW_UP_QUESTION

❌ **Rejected guidance types:**
- HEALTH_WORKER_REVIEW, REFERRAL_WORKFLOW
- FACILITY_READINESS, SYSTEM_CONTEXT

❌ **Rejected content patterns:**
- "dosage", "dose", "medication", "drug"
- "treatment", "procedure", "surgical"
- "intravenous", "injection", "therapy"

### HEALTH_WORKER Audience
✅ **All PATIENT sources plus:**
- WHO ANC digital kit
- NCBI high-risk pregnancy references
- Facility readiness checklists

✅ **All PATIENT guidance types plus:**
- HEALTH_WORKER_REVIEW, REFERRAL_WORKFLOW, FACILITY_READINESS

✅ **No content restrictions** (can see treatment/procedure info)

### ADMIN/DOCS Audience
✅ **Only:**
- SYSTEM_CONTEXT, DIGITAL_HEALTH_ARCHITECTURE
- WHO digital kit, facility standards, government strategy

## Unsafe Chunk Rejection Logic

### Guard 1: Risk Level Mismatch
```
Query Risk HIGH → Reject chunk with guidance [SELF_CARE_AND_MONITOR] + riskLevel LOW/MEDIUM
Query Risk MEDIUM → Accept all
Query Risk LOW → Prefer chunks with riskLevel LOW/MEDIUM
```

### Guard 2: Audience Incompatibility
```
PATIENT audience → Reject if patientRestricted OR restrictedPatientContext
PATIENT audience → Reject if allowedAudiences doesn't include PATIENT
HEALTH_WORKER audience → Accept all (broader access)
```

### Guard 3: Guidance Type Incompatibility
```
Chunk has guidanceTypes [HEALTH_WORKER_REVIEW]
Query audience PATIENT → REJECT (not in AUDIENCE_GUIDANCE_POLICY.PATIENT)
```

### Guard 4: Patient Safety Content
```
PATIENT audience + chunk contains:
  "dosage 500mg" → REJECT
  "intravenous therapy" → REJECT
  "surgical procedure" → REJECT
HEALTH_WORKER/ADMIN audiences → ACCEPT (no restrictions)
```

### Guard 5: Preference Scoring (Ranking)
```
Base score: 0.5
+ evidenceTag overlap (max 0.2)
+ symptom overlap (max 0.2)
+ trusted source bonus (0.1)
= Final score (0-1) for ranking accepted chunks
```

### Guard 6: Generic Guidance Pass-Through
```
Chunk has guidanceType [WARNING_SIGNS, SAFETY_DISCLAIMER]
→ MAY PASS without exact symptom/evidence overlap
→ Used for general maternal health information
→ Still subject to audience and content safety checks
```

## Provider Failure Handling

When query embedding fails:

```javascript
embedResult.error === 'QUOTA_EXHAUSTED'
  → ok: false
  → fallbackRecommended: true
  → warnings: ["Gemini API quota exhausted"]
  → NO throw, returns gracefully

embedResult.error === 'RATE_LIMITED'
  → ok: false
  → fallbackRecommended: true
  → warnings: ["Gemini API rate limited"]
  → Recommends fallback (JSON RAG) + retry later

embedResult.error === 'OTHER'
  → ok: false
  → fallbackRecommended: true
  → warnings: ["Embedding error: ..."]
  → Recommends fallback

Network/Unknown errors
  → ok: false
  → fallbackRecommended: true
  → error: full error message
  → Caller handles fallback to JSON RAG
```

## Backward Compatibility

✅ **NOT modified:**
- rule engine (triage/ruleEngine.js)
- decisionBuilder (triage/decisionBuilder.js)
- safety validator (safety/safetyValidator.js)
- live patient result flow (controllers/*)

✅ **Optional integration:**
- Can call retrieveRuleAware() in new RAG-aware controller
- Existing JSON RAG continues as fallback
- No breaking changes to existing APIs

## Configuration & Environment

Required for retrieval:
```
MONGODB_URI=...
GEMINI_API_KEY=...
```

Optional:
```
RAG_VECTOR_ENABLED=true/false (default false)
```

## Next Steps for Integration

1. Create `backend/src/vectorRag/retrieval/vectorRagIntegration.js`
   - Orchestrate decision → rule-aware query → retrieval → fallback
   - Merge vector results with JSON RAG results if needed

2. Create controller endpoint
   - POST /api/triage/vector-guidance
   - Calls ruleEngine → buildRuleAwareQuery → retrieveRuleAware
   - Falls back to JSON RAG if vector retrieval fails

3. Add integration tests
   - Test with mock decision objects
   - Test audience filtering
   - Test retrieval guard rejection
   - Test provider failure handling

4. Monitoring & logging
   - Log retrieval statistics (accepted/rejected counts)
   - Track guard rejection reasons
   - Monitor embedding latency and costs
   - Alert on fallback rate

---

**Status:** Domain layer complete, ready for integration with rule engine and live triage flow.
