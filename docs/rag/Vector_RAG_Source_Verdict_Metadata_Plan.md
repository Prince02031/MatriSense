# MatriSense Vector RAG Source Verdict and Metadata Plan

## 1. Verdict

The uploaded `docs.zip` is suitable for a stronger Vector RAG implementation, but the sources should not all be treated equally.

Best MVP ingestion order:

```text
1. KnowledgeCards.json
2. Curated markdown summaries in md-files/
3. CDC HEAR HER HTML page
4. Short warning-sign PDFs/posters
5. Long raw PDFs only with strict audience/guidance metadata
```

The summarized markdown files are the safest and cleanest sources for MVP retrieval because they already isolate the parts relevant to MatriSense. The raw PDFs are useful, but several are broad clinical, operational, or strategy documents. They should be indexed with strict metadata so they do not leak irrelevant or unsafe content into patient guidance.

The vector pipeline should therefore be source-agnostic, but MatriSense retrieval should remain domain-aware.

---

## 2. Uploaded Sources Found

### Structured source

```text
docs/KnowledgeCards.json
```

Contains 20 existing RAG cards covering HIGH, MEDIUM, LOW, warning-sign, and safety-disclaimer guidance.

### Curated markdown summaries

```text
docs/md-files/01_who_counselling_danger_signs_summary.md
docs/md-files/02_who_pcpnc_quick_check_rapid_assessment_summary.md
docs/md-files/03_cdc_hear_her_urgent_maternal_warning_signs_summary.md
docs/md-files/04_who_anc_digital_adaptation_kit_summary.md
docs/md-files/05_dghs_bangladesh_mnch_anc_job_aid_summary.md
docs/md-files/06_bangladesh_mnh_service_accreditation_summary.md
docs/md-files/07_bangladesh_national_strategy_maternal_health_2019_2030_summary.md
docs/md-files/08_rule_source_index_for_agents.md
```

### Raw PDF / HTML sources

```text
docs/CDC-Hear-Her-Womens-urgent-warning-signs-h.pdf
docs/Urgent Maternal Warning Signs and Symptoms _ HEAR HER Campaign _ CDC.html
docs/Warning-Signs-Poster_LTR_whitebkg_Bengali.pdf
docs/NCBI_bookshelf_high_risk.pdf
docs/NCTB_information_and_counselling_sheets_high_risk.pdf
docs/WHO-Antinatal-kit.pdf
docs/Checklist-04-Facility-Readiness.pdf
docs/MNH-Service-Accreditation-Manual_Clean_Cor-14-4-23.pdf
docs/government_Strategy.pdf
```

---

## 3. PDF Extraction Verdict

All uploaded PDFs appear text-extractable. None should require OCR for MVP ingestion.

However, text-extractable does not mean retrieval-safe. Some PDFs are broad and should be metadata-restricted.

| Source | Extractability | MVP Retrieval Verdict | Use In Patient Guidance? | Recommended Use |
|---|---:|---|---:|---|
| KnowledgeCards.json | Excellent | Use first | Yes | Primary structured rule-aware RAG source |
| 01 WHO danger-sign summary | Excellent | Use first | Yes | Patient warning signs, emergency planning |
| 02 WHO PCPNC summary | Excellent | Use first | Limited | Rule/worker reasoning, emergency/priority classification |
| 03 CDC HEAR HER summary | Excellent | Use first | Yes | Warning signs, urgent symptoms, follow-up triggers |
| CDC HTML page | Excellent | Use first | Yes | Modern structured warning-sign details |
| CDC warning-sign PDF | Good | Use first | Yes | Poster-style patient warning signs |
| Bengali warning-sign poster PDF | Good but some extraction artifacts possible | Use first with manual review | Yes | Bengali patient wording and warning signs |
| 05 DGHS MNCH summary | Excellent | Use after core sources | Yes, cautiously | Bangladesh-local phrasing and ANC counselling |
| 06 MNH service accreditation summary | Excellent | Use for worker side | No | Referral workflow, health-worker review, audit/status |
| 04 WHO ANC DAK summary | Excellent | Use for architecture/docs | No | Digital workflow, structured decision support |
| 07 Bangladesh strategy summary | Excellent | Use for docs/system context | No | Bangladesh problem framing and referral-system justification |
| NCBI_bookshelf_high_risk.pdf | Text-extractable, broad | Use selectively later | Limited | Full WHO counselling source, patient education sections only |
| NCTB_information_and_counselling_sheets_high_risk.pdf | Text-extractable, very large | Use selectively later | Cautiously | PCPNC/IMCI-style details; avoid treatment/procedure chunks |
| WHO-Antinatal-kit.pdf | Text-extractable, broad | Use later | No | Architecture/data model/workflow, not symptom advice |
| Facility readiness checklist | Text-extractable | Use worker/admin only | No | Facility readiness and referral/hospital assignment context |
| MNH accreditation manual | Text-extractable, broad | Use worker/admin only | No | Workflow, quality, referral documentation |
| Government strategy PDF | Text-extractable but broad | Use docs only | No | Problem framing, national alignment |

---

## 4. Key Design Decision

Use a two-layer architecture.

### 4.1 Reusable Vector RAG Core

This layer should be reusable in other projects:

```text
source registry
source adapters for JSON / Markdown / PDF / HTML
text extraction
chunking
content hashing
embedding client
embedding cache
vector chunk storage
source ingestion status
vector search
provider failure handling
```

### 4.2 MatriSense Domain Layer

This layer is project-specific:

```text
maternal symptom metadata
evidenceTags
riskLevelAllowed
guidanceTypes
audience filters
rule-aware retrieval guards
HIGH-risk safety constraints
JSON RAG fallback
```

The pipeline can be reused elsewhere, but another project would replace the MatriSense domain metadata/guards.

---

## 5. Recommended Folder Structure

```text
backend/src/vectorRag/
  core/
    embeddingClient.js
    providers/geminiEmbeddingProvider.js
    hashContent.js
    chunkText.js
    sourceRegistryLoader.js
    ingestionRunner.js

  models/
    VectorKnowledgeSource.js
    VectorKnowledgeChunk.js

  adapters/
    knowledgeCardAdapter.js
    markdownAdapter.js
    pdfAdapter.js
    htmlAdapter.js

  domain/
    matrisense/
      matrisenseMetadataPolicy.js
      maternalKeywordMap.js
      guidanceTypePolicy.js
      retrievalGuards.js
      buildRuleAwareQuery.js

  retrieval/
    vectorSearch.js
    ruleAwareVectorRetriever.js
    hybridRagService.js

  tests/
    runIngestionSmokeTest.js
    runRuleAwareVectorRagTest.js
    runHybridFallbackTest.js
```

If the current project style prefers fewer folders, this can be flattened, but keep the conceptual separation between reusable core and MatriSense-specific domain policy.

---

## 6. Recommended Metadata Fields

Each chunk should store:

```js
{
  chunkId,
  sourceId,
  sourceKind,              // KNOWLEDGE_CARD | MARKDOWN | PDF | HTML
  sourceTitle,
  sourcePath,
  sourceUrl,
  pageStart,
  pageEnd,
  sectionTitle,
  text,
  textHash,
  language,                // bn | en | mixed
  embedding,

  symptoms,
  evidenceTags,
  riskLevelAllowed,
  guidanceTypes,
  audience,                // PATIENT | HEALTH_WORKER | ADMIN | DOCS
  sourceUse,               // patient_guidance | worker_workflow | architecture | system_context
  trusted,
  priority,
  createdAt,
  updatedAt
}
```

---

## 7. MatriSense Guidance Types

Use this controlled set:

```text
URGENT_ESCALATION
CONTACT_HEALTH_WORKER
SELF_CARE_AND_MONITOR
WARNING_SIGNS
SAFETY_DISCLAIMER
FOLLOW_UP_QUESTION
HEALTH_WORKER_REVIEW
REFERRAL_WORKFLOW
FACILITY_READINESS
SYSTEM_CONTEXT
DIGITAL_HEALTH_ARCHITECTURE
```

Patient result generation should allow only:

```text
URGENT_ESCALATION
CONTACT_HEALTH_WORKER
SELF_CARE_AND_MONITOR
WARNING_SIGNS
SAFETY_DISCLAIMER
FOLLOW_UP_QUESTION
```

Worker dashboard can additionally allow:

```text
HEALTH_WORKER_REVIEW
REFERRAL_WORKFLOW
FACILITY_READINESS
```

Docs/admin pages can use:

```text
SYSTEM_CONTEXT
DIGITAL_HEALTH_ARCHITECTURE
```

---

## 8. Symptom and Evidence Tag Map

Use this initial MatriSense metadata map.

| Concept | Symptoms | Evidence Tags | Keywords |
|---|---|---|---|
| Vaginal bleeding | `vaginal_bleeding` | `WHO_PREGNANCY_DANGER_SIGNS`, `WHO_PCPNC_QUICK_CHECK`, `CDC_HEAR_HER` | bleeding, vaginal bleeding, রক্তপাত |
| Convulsion | `convulsion` | `WHO_PCPNC_QUICK_CHECK`, `WHO_PREGNANCY_DANGER_SIGNS` | convulsion, fits, seizure, খিঁচুনি |
| Severe headache | `headache`, `severe_headache` | `WHO_PREGNANCY_DANGER_SIGNS`, `CDC_HEAR_HER` | severe headache, worst headache, headache that won't go away, মাথাব্যথা |
| Blurred vision | `blurred_vision`, `visual_disturbance` | `WHO_PREGNANCY_DANGER_SIGNS`, `CDC_HEAR_HER` | blurred vision, vision changes, double vision, ঝাপসা |
| Severe abdominal pain | `severe_abdominal_pain` | `WHO_PCPNC_SEVERE_ABDOMINAL_PAIN`, `CDC_HEAR_HER` | severe belly pain, severe abdominal pain, পেটে তীব্র ব্যথা |
| Fever | `fever` | `WHO_PREGNANCY_DANGER_SIGNS`, `CDC_HEAR_HER` | fever, temperature, 100.4, জ্বর |
| Severe weakness | `severe_weakness` | `WHO_PREGNANCY_DANGER_SIGNS` | very weak, extreme tiredness, দুর্বল |
| Difficulty breathing | `difficulty_breathing`, `severe_difficulty_breathing` | `WHO_PREGNANCY_DANGER_SIGNS`, `CDC_HEAR_HER` | trouble breathing, short of breath, শ্বাসকষ্ট |
| Repeated vomiting | `vomiting_repeated`, `severe_vomiting` | `CDC_HEAR_HER`, `WHO_PCPNC_QUICK_CHECK` | severe nausea, throwing up, unable to keep water, বমি |
| Reduced fetal movement | `reduced_fetal_movement` | `CDC_HEAR_HER` | baby stopped moving, fetal movement, বাচ্চা নড়াচড়া কম |
| Dizziness/fainting | `dizziness`, `fainting`, `fainting_or_unconscious` | `CDC_HEAR_HER`, `WHO_PCPNC_QUICK_CHECK` | dizziness, fainting, pass out, মাথা ঘোরা, অজ্ঞান |
| Swelling | `swelling`, `face_hand_swelling` | `CDC_HEAR_HER` | swelling of hands or face, swollen face, ফুলে যাওয়া |
| Chest pain/fast heartbeat | `chest_pain`, `fast_heartbeat` | `CDC_HEAR_HER` | chest pain, fast heartbeat, irregular heartbeat |
| Self-harm thoughts | `self_harm_thoughts` | `CDC_HEAR_HER` | harming yourself, hurting your baby, suicidal thoughts |

---

## 9. Source-Level Metadata Recommendations

### `knowledge-cards`

```json
{
  "sourceId": "knowledge-cards",
  "sourceKind": "KNOWLEDGE_CARD",
  "path": "backend/src/rag/KnowledgeCards.json",
  "title": "MatriSense Rule-Aware Knowledge Cards",
  "language": "bn",
  "trusted": true,
  "priority": 100,
  "defaultMetadata": {
    "audience": ["PATIENT", "HEALTH_WORKER"],
    "sourceUse": "patient_guidance"
  }
}
```

### `who-danger-signs-summary`

Use for patient-facing danger signs and emergency planning.

```json
{
  "riskLevelAllowed": ["HIGH", "MEDIUM", "LOW"],
  "guidanceTypes": ["URGENT_ESCALATION", "WARNING_SIGNS", "FOLLOW_UP_QUESTION", "SAFETY_DISCLAIMER"],
  "audience": ["PATIENT", "HEALTH_WORKER"],
  "sourceUse": "patient_guidance",
  "evidenceTags": ["WHO_PREGNANCY_DANGER_SIGNS"]
}
```

### `who-pcpnc-summary`

Use primarily for triage/explainability and worker reasoning, with limited patient wording.

```json
{
  "riskLevelAllowed": ["HIGH", "MEDIUM"],
  "guidanceTypes": ["URGENT_ESCALATION", "CONTACT_HEALTH_WORKER", "HEALTH_WORKER_REVIEW"],
  "audience": ["HEALTH_WORKER", "PATIENT"],
  "sourceUse": "triage_reasoning",
  "evidenceTags": ["WHO_PCPNC_QUICK_CHECK"]
}
```

### `cdc-hear-her-summary`, `cdc-hear-her-html`, `cdc-hear-her-poster`

Use for patient warning signs.

```json
{
  "riskLevelAllowed": ["HIGH", "MEDIUM", "LOW"],
  "guidanceTypes": ["URGENT_ESCALATION", "WARNING_SIGNS", "FOLLOW_UP_QUESTION"],
  "audience": ["PATIENT", "HEALTH_WORKER"],
  "sourceUse": "patient_guidance",
  "evidenceTags": ["CDC_HEAR_HER"]
}
```

### `dghs-mnch-summary`

Use for Bangladesh-local ANC counselling and wording.

```json
{
  "riskLevelAllowed": ["HIGH", "MEDIUM", "LOW"],
  "guidanceTypes": ["WARNING_SIGNS", "CONTACT_HEALTH_WORKER", "FOLLOW_UP_QUESTION"],
  "audience": ["PATIENT", "HEALTH_WORKER"],
  "sourceUse": "local_patient_counselling",
  "evidenceTags": ["BD_MNCH_ANC_COUNSELLING"]
}
```

### `mnh-accreditation-summary`, `facility-readiness-pdf`, `mnh-manual-pdf`

Use for worker/admin workflow only.

```json
{
  "riskLevelAllowed": ["HIGH", "MEDIUM"],
  "guidanceTypes": ["HEALTH_WORKER_REVIEW", "REFERRAL_WORKFLOW", "FACILITY_READINESS"],
  "audience": ["HEALTH_WORKER", "ADMIN"],
  "sourceUse": "worker_workflow",
  "evidenceTags": ["BD_MNH_WORKER_REVIEW", "BD_MNH_FACILITY_READINESS"]
}
```

### `who-anc-dak-summary`, `who-anc-dak-pdf`

Use for architecture/docs/admin, not patient guidance.

```json
{
  "riskLevelAllowed": ["LOW", "MEDIUM", "HIGH"],
  "guidanceTypes": ["DIGITAL_HEALTH_ARCHITECTURE", "SYSTEM_CONTEXT"],
  "audience": ["ADMIN", "DOCS"],
  "sourceUse": "architecture",
  "evidenceTags": ["WHO_ANC_DAK_DIGITAL_WORKFLOW"]
}
```

### `bangladesh-strategy-summary`, `government-strategy-pdf`

Use for docs/problem framing only.

```json
{
  "riskLevelAllowed": ["LOW", "MEDIUM", "HIGH"],
  "guidanceTypes": ["SYSTEM_CONTEXT"],
  "audience": ["DOCS", "ADMIN"],
  "sourceUse": "system_context",
  "evidenceTags": ["BD_MATERNAL_STRATEGY_REFERRAL"]
}
```

---

## 10. Patient Guidance Retrieval Guard

When generating patient-facing output, reject any chunk if:

```text
chunk.audience does not include PATIENT
chunk.guidanceTypes only include SYSTEM_CONTEXT, FACILITY_READINESS, DIGITAL_HEALTH_ARCHITECTURE, HEALTH_WORKER_REVIEW, or REFERRAL_WORKFLOW
chunk.riskLevelAllowed does not include the rule engine risk level
HIGH-risk decision and chunk is LOW-only SELF_CARE_AND_MONITOR
chunk contains treatment/procedure/dosage language
chunk has no symptom/evidence overlap and is not a general WARNING_SIGNS or SAFETY_DISCLAIMER chunk
```

---

## 11. Fallback Requirements

Because free Gemini API limits may be hit, fallback is mandatory.

Runtime fallback chain:

```text
1. Try hybrid vector RAG.
2. If query embedding succeeds, retrieve vector chunks and apply metadata guards.
3. If embedding quota/rate-limit/provider error occurs, skip vector retrieval.
4. Use existing JSON rule-aware RAG.
5. If JSON RAG fails, use a conservative hardcoded safety fallback based on rule decision.
6. Never block patient triage because vector RAG fails.
```

Ingestion fallback:

```text
Do not embed during live patient triage except the query embedding.
Ingest documents offline with npm run rag:ingest.
Use textHash/contentHash to skip unchanged chunks.
Add embedding cache so repeated chunks are not re-embedded.
If one PDF fails, mark that source as ERROR/PARTIAL and continue.
If a PDF has no extractable text, mark SKIPPED_NEEDS_OCR.
```

---

## 12. Source Registry Draft

A full JSON draft is provided separately in:

```text
MatriSense_Vector_RAG_Source_Registry_Draft.json
```

Use it as a starting point. The actual paths may need adjustment depending on where the teammate places these files inside the backend project.

---

## 13. Final Recommendation

Proceed with vector RAG using:

```text
KnowledgeCards.json + markdown summaries + selected CDC HTML/PDF sources first.
```

Use the large raw PDFs, facility documents, WHO DAK, and government strategy only with strict metadata and audience filters.

Do not allow raw PDF chunks to override the rule engine or existing JSON RAG.

The safest and strongest final architecture is:

```text
rule engine decision
→ JSON knowledge cards
→ metadata-filtered vector chunks from cards/markdown/PDF/HTML
→ merged careGuidanceContext
→ Bangla explanation
→ safety validator
→ fallback to JSON RAG if vector fails
```
