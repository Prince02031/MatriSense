# MatriSense Vector RAG: Revised Agent Prompt Array

## Important Setup

Use these prompts sequentially. They are redesigned for:

```text
- source-agnostic Vector RAG core
- MatriSense-specific metadata/guard layer
- KnowledgeCards.json + markdown + PDF + HTML ingestion
- Gemini free-tier/quota-safe embedding behavior
- mandatory JSON rule-aware RAG fallback
```

Do not ask the agent to run all prompts at once if quota is limited.

Recommended minimum sequence:

```text
Prompt 1 - Copy and register sources
Prompt 2 - Build reusable vector RAG core and models
Prompt 3 - Build source adapters and ingestion
Prompt 4 - Build MatriSense metadata policy and retrieval guards
Prompt 5 - Add tests and smoke scripts
Prompt 6 - Integrate hybrid RAG behind RAG_MODE flag
Prompt 7 - Add admin/debug visibility
```

---

# Prompt 1 - Prepare Source Documents and Source Registry

```text
You are working on the MatriSense project.

Goal:
Prepare the RAG source document structure and source registry for a source-agnostic Vector RAG pipeline.

Current RAG:
- Existing JSON/card RAG uses KnowledgeCards.json.
- The current patient -> triage -> health worker flow is working.
- Do not modify live patient flow, rule engine, decisionBuilder, LLM explanation, or safety validator.

Source files to support:
- KnowledgeCards.json
- curated markdown summaries
- PDFs
- CDC HTML page

Create this folder if missing:
backend/data/rag/source-documents/

Inside it, support:
backend/data/rag/source-documents/md-files/
backend/data/rag/source-documents/*.pdf
backend/data/rag/source-documents/*.html

Copy or expect these files:
- KnowledgeCards.json should remain in its current backend/src/rag location if already used by JSON RAG.
- md-files/01_who_counselling_danger_signs_summary.md
- md-files/02_who_pcpnc_quick_check_rapid_assessment_summary.md
- md-files/03_cdc_hear_her_urgent_maternal_warning_signs_summary.md
- md-files/04_who_anc_digital_adaptation_kit_summary.md
- md-files/05_dghs_bangladesh_mnch_anc_job_aid_summary.md
- md-files/06_bangladesh_mnh_service_accreditation_summary.md
- md-files/07_bangladesh_national_strategy_maternal_health_2019_2030_summary.md
- md-files/08_rule_source_index_for_agents.md
- CDC-Hear-Her-Womens-urgent-warning-signs-h.pdf
- Warning-Signs-Poster_LTR_whitebkg_Bengali.pdf
- Urgent Maternal Warning Signs and Symptoms _ HEAR HER Campaign _ CDC.html
- NCBI_bookshelf_high_risk.pdf
- NCTB_information_and_counselling_sheets_high_risk.pdf
- WHO-Antinatal-kit.pdf
- Checklist-04-Facility-Readiness.pdf
- MNH-Service-Accreditation-Manual_Clean_Cor-14-4-23.pdf
- government_Strategy.pdf

Create:
backend/src/vectorRag/ingestion/sourceRegistry.json

The registry must support entries with:
- sourceId
- sourceKind: KNOWLEDGE_CARD | MARKDOWN | PDF | HTML
- path
- title
- language
- trusted
- priority
- defaultMetadata

Use this source priority logic:
1. KnowledgeCards.json is highest priority and should remain the safest fallback source.
2. Markdown summaries are high priority because they are curated.
3. CDC HTML/PDF/poster are high priority for warning signs.
4. Long raw PDFs are lower priority and must have restricted audience/guidanceTypes.
5. Strategy/facility/architecture sources must not appear in patient guidance.

Use these guidanceTypes:
- URGENT_ESCALATION
- CONTACT_HEALTH_WORKER
- SELF_CARE_AND_MONITOR
- WARNING_SIGNS
- SAFETY_DISCLAIMER
- FOLLOW_UP_QUESTION
- HEALTH_WORKER_REVIEW
- REFERRAL_WORKFLOW
- FACILITY_READINESS
- SYSTEM_CONTEXT
- DIGITAL_HEALTH_ARCHITECTURE

Use these audiences:
- PATIENT
- HEALTH_WORKER
- ADMIN
- DOCS

Important metadata rules:
- WHO danger-sign summary: patient guidance, warning signs, urgent escalation.
- WHO PCPNC summary: triage reasoning and health-worker review; limited patient guidance.
- CDC HEAR HER summary/html/pdf/poster: patient warning signs.
- DGHS MNCH summary: local patient counselling and Bangladesh wording.
- MNH accreditation/facility readiness: worker/admin workflow only.
- WHO ANC Digital Adaptation Kit: architecture/docs only.
- Bangladesh strategy: docs/system context only.

Do not integrate Vector RAG into live output yet.

After editing:
- List exact files changed.
- Explain where source documents should be placed.
- Explain which sources are allowed for patient guidance and which are worker/docs only.
```

---

# Prompt 2 - Build Reusable Vector RAG Core and Models

```text
You are working on MatriSense.

Goal:
Build the reusable Vector RAG core and Mongo models without integrating it into live patient output.

Do not modify:
- rule engine
- decisionBuilder
- AI extraction
- LLM explanation
- safety validator
- patient result flow
- worker flow

Create or update:
backend/src/vectorRag/core/embeddingClient.js
backend/src/vectorRag/core/providers/geminiEmbeddingProvider.js
backend/src/vectorRag/core/hashContent.js
backend/src/vectorRag/core/chunkText.js
backend/src/vectorRag/core/sourceRegistryLoader.js
backend/src/vectorRag/models/VectorKnowledgeSource.js
backend/src/vectorRag/models/VectorKnowledgeChunk.js

Environment variables:
EMBEDDING_PROVIDER=gemini
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
RAG_VECTOR_ENABLED=false
RAG_MODE=json

Requirements:

1. VectorKnowledgeSource model:
- sourceId
- sourceKind
- title
- path
- language
- trusted
- priority
- defaultMetadata
- ingestionStatus: PENDING | INGESTED | PARTIAL | ERROR | SKIPPED_NEEDS_OCR
- lastIngestedAt
- chunkCount
- errorMessage

2. VectorKnowledgeChunk model:
- chunkId
- sourceId
- sourceKind
- sourceTitle
- sourcePath
- sourceUrl
- pageStart
- pageEnd
- sectionTitle
- text
- textHash
- language
- embedding
- symptoms
- evidenceTags
- riskLevelAllowed
- guidanceTypes
- audience
- sourceUse
- trusted
- priority
- createdAt
- updatedAt

3. embeddingClient:
- Only call embedding provider from backend.
- Do not expose API keys.
- Return structured errors on quota/rate limit/provider failure.
- Do not throw unhandled errors.

4. Gemini embedding provider:
- Use existing Gemini API key config if present.
- Otherwise read from env.
- Support single-text embedding first.
- Keep batch support optional.

5. hashContent:
- Provide stable hashing for text and metadata.
- Used to avoid duplicate re-embedding.

6. chunkText:
- Chunk size around 700-1000 characters.
- Overlap around 150-250 characters.
- Discard tiny chunks under 100 characters unless they come from KnowledgeCards.

7. sourceRegistryLoader:
- Load sourceRegistry.json.
- Validate required fields.
- Return clear errors without crashing the app.

Rules:
- No live integration yet.
- No runtime patient triage should depend on vector RAG yet.
- Keep the system reusable. Do not hardcode maternal rules inside core files.

After editing:
- List exact files changed.
- Explain model fields.
- Explain Gemini quota failure behavior.
- Explain how duplicate embeddings are avoided.
```

---

# Prompt 3 - Build Source Adapters and Ingestion Pipeline

```text
You are working on MatriSense.

Goal:
Build ingestion for KnowledgeCards.json, markdown summaries, PDFs, and HTML using the reusable vector RAG core.

Do not modify:
- live patient result flow
- rule engine
- decisionBuilder
- LLM explanation
- safety validator

Create or update:
backend/src/vectorRag/adapters/knowledgeCardAdapter.js
backend/src/vectorRag/adapters/markdownAdapter.js
backend/src/vectorRag/adapters/pdfAdapter.js
backend/src/vectorRag/adapters/htmlAdapter.js
backend/src/vectorRag/ingestion/ingestAllSources.js
backend/src/vectorRag/ingestion/embeddingCache.js if useful

Requirements:

1. All adapters must return normalized records:
{
  sourceId,
  sourceKind,
  sourceTitle,
  sourcePath,
  pageStart,
  pageEnd,
  sectionTitle,
  text,
  metadata
}

2. knowledgeCardAdapter:
- Read existing KnowledgeCards.json.
- Preserve card id as chunkId seed.
- Preserve symptoms.
- Preserve riskLevelAllowed.
- Preserve guidanceType/guidanceTypes.
- Preserve evidenceTag/evidenceTags.
- Preserve Bangla steps, monitor text, escalation triggers, safety/doNotSay.

3. markdownAdapter:
- Read curated summary markdown files.
- Split by headings when possible.
- Preserve heading as sectionTitle.
- Keep source-level metadata from registry.

4. pdfAdapter:
- Extract text only.
- No OCR.
- If a PDF has no extractable text, mark SKIPPED_NEEDS_OCR.
- If a PDF is missing/unreadable, mark ERROR for that source and continue.
- Preserve pageStart/pageEnd if the extraction library supports it.
- Never crash the entire ingestion run because one PDF fails.

5. htmlAdapter:
- Strip scripts/styles/navigation noise as much as simple implementation allows.
- Extract visible text.
- Preserve major headings if possible.

6. ingestAllSources:
- Read sourceRegistry.json.
- Process each source through correct adapter.
- Apply chunkText.
- Apply MatriSense metadata enrichment only through domain policy, not core.
- Generate embeddings.
- Upsert by chunkId or textHash.
- Skip embedding when unchanged.
- Update VectorKnowledgeSource ingestion status.
- Print summary:
  - sources processed
  - chunks created
  - chunks updated
  - chunks skipped
  - provider errors
  - missing/skipped PDFs

7. Quota safety:
- Add optional delay between embedding calls.
- Support max chunks per run via env, for example RAG_INGEST_MAX_CHUNKS.
- If Gemini quota/rate-limit is hit, stop cleanly and mark remaining source PARTIAL.
- Do not lose already embedded chunks.

8. Add npm scripts:
- rag:ingest
- rag:ingest:dry

After editing:
- List exact files changed.
- Explain how to run ingestion.
- Explain how partial ingestion works when Gemini quota is hit.
- Explain how missing/scanned PDFs are handled.
```

---

# Prompt 4 - Add MatriSense Metadata Policy and Retrieval Guards

```text
You are working on MatriSense.

Goal:
Add MatriSense-specific metadata enrichment, rule-aware query building, and retrieval guards.

Do not modify:
- rule engine
- decisionBuilder
- safety validator
- live patient result flow

Create or update:
backend/src/vectorRag/domain/matrisense/maternalKeywordMap.js
backend/src/vectorRag/domain/matrisense/matrisenseMetadataPolicy.js
backend/src/vectorRag/domain/matrisense/guidanceTypePolicy.js
backend/src/vectorRag/domain/matrisense/buildRuleAwareQuery.js
backend/src/vectorRag/domain/matrisense/retrievalGuards.js
backend/src/vectorRag/retrieval/vectorSearch.js
backend/src/vectorRag/retrieval/ruleAwareVectorRetriever.js

Requirements:

1. maternalKeywordMap should cover:
- vaginal_bleeding
- convulsion
- headache / severe_headache
- blurred_vision / visual_disturbance
- severe_abdominal_pain
- fever
- severe_weakness
- difficulty_breathing / severe_difficulty_breathing
- vomiting_repeated / severe_vomiting
- reduced_fetal_movement
- dizziness / fainting
- swelling / face_hand_swelling
- chest_pain / fast_heartbeat
- self_harm_thoughts

Use English and Bangla keywords where practical.

2. matrisenseMetadataPolicy:
- Merge registry defaultMetadata with adapter metadata.
- Add symptoms/evidenceTags based on keyword matches.
- Keep source-level restrictions.
- Do not make patient-only chunks out of worker/docs sources.

3. guidanceTypePolicy:
Patient-facing output may use only:
- URGENT_ESCALATION
- CONTACT_HEALTH_WORKER
- SELF_CARE_AND_MONITOR
- WARNING_SIGNS
- SAFETY_DISCLAIMER
- FOLLOW_UP_QUESTION

Worker output may also use:
- HEALTH_WORKER_REVIEW
- REFERRAL_WORKFLOW
- FACILITY_READINESS

Docs/admin may use:
- SYSTEM_CONTEXT
- DIGITAL_HEALTH_ARCHITECTURE

4. buildRuleAwareQuery:
Accept:
{
  decision,
  caseState,
  topK,
  audience
}

Build query text from:
- decision.riskLevel
- decision.evidenceTags
- decision.allowedGuidanceType
- matched rule names if available
- caseState symptoms
- confirmed symptoms

Do not rely only on raw patient text.

5. ruleAwareVectorRetriever:
- Embed query.
- Run MongoDB vector search.
- Apply metadata filters.
- Apply retrieval guards.
- Return structured object:
{
  ok,
  mode,
  queryText,
  filtersApplied,
  retrievedChunks,
  rejectedChunks,
  warnings,
  fallbackRecommended
}

6. Retrieval guards:
- HIGH risk must not return LOW-only SELF_CARE_AND_MONITOR chunks.
- Patient guidance must reject worker/docs-only chunks.
- Chunks with incompatible riskLevelAllowed must be rejected.
- Chunks with incompatible guidanceTypes must be rejected.
- Chunks with treatment, procedure, or medicine dosage wording should be rejected for patient guidance.
- Prefer evidenceTag overlap.
- Prefer symptom overlap.
- General WARNING_SIGNS and SAFETY_DISCLAIMER chunks may pass without exact symptom overlap.

7. Provider failure:
If query embedding fails because Gemini quota/rate-limit/provider error:
- return ok=false
- fallbackRecommended=true
- do not throw

After editing:
- List exact files changed.
- Explain metadata enrichment.
- Explain patient-vs-worker audience filtering.
- Explain how unsafe chunks are rejected.
```

---

# Prompt 5 - Add Smoke Tests and Retrieval Safety Tests

```text
You are working on MatriSense.

Goal:
Add test scripts for ingestion, PDF/HTML source handling, rule-aware retrieval, and fallback behavior before live integration.

Do not modify live patient result flow yet.

Create or update:
backend/src/vectorRag/tests/runIngestionSmokeTest.js
backend/src/vectorRag/tests/runPdfHtmlSmokeTest.js
backend/src/vectorRag/tests/runRuleAwareVectorRagTest.js
backend/src/vectorRag/tests/runHybridFallbackTest.js

Add npm scripts:
- rag:smoke
- rag:pdf-smoke
- rag:retrieval-test
- rag:fallback-test

Test cases:

1. Ingestion smoke:
- MongoDB connection works.
- Source registry loads.
- VectorKnowledgeSource records exist.
- VectorKnowledgeChunk count is greater than zero after ingestion.
- Chunks have sourceId, text, textHash, metadata.

2. PDF/HTML smoke:
- CDC HTML extracts meaningful warning-sign text.
- CDC PDF extracts meaningful text.
- Bengali warning-sign poster extracts text or reports extraction limitations clearly.
- Long PDFs do not crash ingestion.
- Missing PDFs are reported clearly.

3. HIGH headache + blurred vision retrieval:
Decision:
- riskLevel HIGH
- symptoms headache, blurred_vision
- evidenceTags WHO_PREGNANCY_DANGER_SIGNS or CDC_HEAR_HER
Expected:
- returns headache/vision warning chunks
- does not return LOW-only self-care headache chunks
- does not return worker/docs-only chunks for PATIENT audience

4. HIGH bleeding retrieval:
Expected:
- returns vaginal bleeding urgent/warning chunks
- rejects unrelated fever-only chunks unless general warning sign

5. LOW mild nausea retrieval:
Expected:
- may return SELF_CARE_AND_MONITOR if compatible
- should include warning signs or safety disclaimer if available

6. Worker audience retrieval:
Expected:
- can return HEALTH_WORKER_REVIEW or REFERRAL_WORKFLOW chunks
- can include MNH accreditation/facility readiness sources

7. Fallback test:
Mock embedding provider failure.
Expected:
- vector retriever returns fallbackRecommended=true
- no unhandled throw
- caller can fall back to JSON RAG

After editing:
- List exact files changed.
- Explain how to run each test.
- Explain what passing results should look like.
```

---

# Prompt 6 - Integrate Hybrid RAG Behind RAG_MODE Flag

```text
You are working on MatriSense.

Goal:
Integrate Vector RAG into the existing RAG pipeline as optional hybrid retrieval, with mandatory fallback to existing JSON card RAG.

Important:
Do not replace JSON RAG.
Do not let Vector RAG decide risk.
Do not change rule engine decisions.
Do not remove safety validator.

Inspect:
- backend/src/rag/evidenceRetriever.js
- backend/src/rag/careGuidanceAssembler.js
- backend/src/ai explanation flow
- backend/src/vectorRag/retrieval/ruleAwareVectorRetriever.js
- existing safety validator flow

Create or update:
backend/src/rag/hybridEvidenceRetriever.js
backend/src/vectorRag/retrieval/hybridRagService.js if needed

Environment:
RAG_MODE=json | hybrid | vector
Default: json

Required behavior:

1. RAG_MODE=json:
- Use existing JSON/card RAG only.
- This must remain default and stable.

2. RAG_MODE=hybrid:
- Call existing JSON/card retriever.
- Call rule-aware vector retriever.
- Merge safe vector chunks with JSON card output.
- Deduplicate repeated guidance.
- Preserve JSON RAG as primary fallback.
- Add vector chunks as supporting evidence/context.

3. RAG_MODE=vector:
- Use vector retriever first, but still fallback to JSON if vector fails or unsafe.
- Do not allow vector-only output if metadata guards reject chunks.

4. Failure handling:
If Gemini query embedding fails, Mongo vector search fails, or no safe chunks are found:
- log warning
- set vectorFallbackUsed=true
- continue with JSON RAG
- do not fail patient triage

5. careGuidanceContext should optionally include:
- ragMode
- retrievedCards
- retrievedChunks
- vectorSources
- vectorFallbackUsed
- retrievalWarnings

6. Patient-facing LLM explanation:
- May use vector chunks as supporting evidence.
- Must not allow chunks to override riskLevel, recommendedAction, or allowedGuidanceType.
- Must not include treatment/procedure/dosage content.

7. Safety validator remains final gate.

8. Add integration test:
High-risk headache + blurred vision in hybrid mode.
Expected:
- risk remains HIGH
- JSON card guidance still present
- safe vector chunks appear if available
- no LOW-only self-care guidance appears
- if vector fails, JSON output still works

After editing:
- List exact files changed.
- Explain RAG_MODE behavior.
- Explain fallback behavior.
- Explain how vector chunks are merged.
- Explain why rule engine still controls medical risk.
```

---

# Prompt 7 - Add Admin Debug Visibility for Vector RAG

```text
You are working on MatriSense.

Goal:
Add lightweight admin/dev visibility for Vector RAG retrieval without changing patient flow.

Do not modify:
- rule engine
- safety validator
- patient result UI unless already using debug fields

Inspect:
- backend admin/dev routes
- frontend admin AI explanation page
- existing RAG preview/admin pages if any

Backend requirements:
Add or update admin/dev endpoint:
POST /api/admin/vector-rag/preview

Payload:
{
  riskLevel,
  symptoms,
  evidenceTags,
  allowedGuidanceType,
  audience,
  topK
}

Response:
{
  ok,
  queryText,
  filtersApplied,
  retrievedChunks,
  rejectedChunks,
  warnings,
  fallbackRecommended
}

Frontend requirements:
Add a simple debug panel in the existing admin AI explanation/RAG preview area if feasible.
Show:
- RAG mode
- query text
- metadata filters
- retrieved chunks
- source title/source kind
- score
- evidenceTags
- symptoms
- guidanceTypes
- audience
- rejected chunks and rejection reason
- fallbackRecommended

Rules:
- Admin/debug only.
- Do not expose raw debug detail to patient UI.
- Do not break existing admin AI testing page.

After editing:
- List exact files changed.
- Explain how to use the preview endpoint.
- Explain what judges/admins can see in debug mode.
```
