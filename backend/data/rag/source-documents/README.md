# RAG Source Documents Structure

This directory contains curated source documents for Vector RAG ingestion pipeline in MatriSense.

## Folder Structure

```
backend/data/rag/source-documents/
├── README.md                    (this file)
├── md-files/                    (curated markdown summaries)
│   ├── 01_who_counselling_danger_signs_summary.md
│   ├── 02_who_pcpnc_quick_check_rapid_assessment_summary.md
│   ├── 03_cdc_hear_her_urgent_maternal_warning_signs_summary.md
│   ├── 04_who_anc_digital_adaptation_kit_summary.md
│   ├── 05_dghs_bangladesh_mnch_anc_job_aid_summary.md
│   ├── 06_bangladesh_mnh_service_accreditation_summary.md
│   ├── 07_bangladesh_national_strategy_maternal_health_2019_2030_summary.md
│   └── 08_rule_source_index_for_agents.md
├── *.pdf                        (trusted PDFs for health guidance)
│   ├── CDC-Hear-Her-Womens-urgent-warning-signs-h.pdf
│   ├── Warning-Signs-Poster_LTR_whitebkg_Bengali.pdf
│   ├── NCBI_bookshelf_high_risk.pdf
│   ├── NCTB_information_and_counselling_sheets_high_risk.pdf
│   ├── WHO-Antinatal-kit.pdf
│   ├── Checklist-04-Facility-Readiness.pdf
│   ├── MNH-Service-Accreditation-Manual_Clean_Cor-14-4-23.pdf
│   └── government_Strategy.pdf
└── *.html                       (web resources)
    └── cdc-hear-her-warning-signs.html
```

## Source Categories

### 1. Knowledge Cards (Highest Priority)
- **Location:** `backend/src/rag/knowledgeCards.json` (NOT MOVED, remains in original location)
- **Purpose:** Live JSON RAG system. Curated condition-specific guidance.
- **Status:** Active in patient flow
- **Audience:** Patients, Health Workers
- **Note:** This file is the safest fallback source and is NOT copied to source-documents. It remains the active JSON RAG system.

### 2. Curated Markdown Summaries (High Priority)
- **Location:** `backend/data/rag/source-documents/md-files/`
- **Purpose:** Source summaries extracted from trusted clinical and policy documents
- **Patient-Safe Summaries:**
  - WHO Counselling Danger Signs
  - CDC HEAR HER Warning Signs
  - DGHS Bangladesh MNCH Job Aid
- **Worker/Admin-Only Summaries:**
  - WHO PCPNC Quick Check (limited patient guidance)
  - WHO ANC Digital Kit (architecture/docs only)
  - MNH Service Accreditation (worker/admin workflow only)
  - Bangladesh National Strategy (policy/context only)

### 3. PDFs (Medium-High Priority for CDC/WHO, Medium for Implementation)
- **Location:** `backend/data/rag/source-documents/`
- **Patient-Safe PDFs:**
  - CDC HEAR HER women's urgent warning signs
  - Warning Signs Poster (Bengali)
- **Worker/Admin-Only PDFs:**
  - NCBI high-risk pregnancy reference
  - NCTB counselling sheets
  - WHO Antenatal Kit
  - Facility Readiness Checklist
  - MNH Service Accreditation Manual
  - Government Strategy

### 4. HTML Resources (High Priority for CDC)
- **Location:** `backend/data/rag/source-documents/cdc-hear-her-warning-signs.html`
- **Purpose:** CDC HEAR HER campaign HTML page
- **Audience:** Patients, Health Workers
- **Note:** Patient-safe warning signs content

## Patient Guidance vs. Worker/Docs Only

### Allowed for Patient Guidance
These sources can be used to generate patient-facing output:
- Knowledge Cards (JSON RAG)
- WHO Danger Signs (markdown + PDF)
- CDC HEAR HER (markdown, PDF, HTML, poster)
- DGHS Bangladesh MNCH (markdown)

**Allowed Guidance Types for Patients:**
- URGENT_ESCALATION
- CONTACT_HEALTH_WORKER
- SELF_CARE_AND_MONITOR
- WARNING_SIGNS
- SAFETY_DISCLAIMER
- FOLLOW_UP_QUESTION

### Restricted to Worker/Admin/Docs
These sources must NOT appear in patient guidance:
- WHO PCPNC (limited patient context; health worker review focus)
- WHO ANC Digital Kit (architecture/implementation only)
- MNH Service Accreditation summaries (facility standards only)
- Bangladesh National Strategy (policy context only)
- NCBI High-Risk (clinical reference, worker review only)
- NCTB Counselling Sheets (worker guidance with limited patient content)
- Facility Readiness Checklist (facility assessment only)
- MNH Accreditation Manual (facility standards only)
- Government Strategy (policy context only)

**Worker/Admin Allowed Guidance Types:**
- HEALTH_WORKER_REVIEW
- REFERRAL_WORKFLOW
- FACILITY_READINESS
- SYSTEM_CONTEXT
- DIGITAL_HEALTH_ARCHITECTURE

## Source Priority Ordering

1. **Priority 1 (Highest):** Knowledge Cards JSON (fallback, safest)
2. **Priority 2 (High):** Curated markdown + CDC/WHO trusted warnings
3. **Priority 3 (Medium):** Implementation and local guidance
4. **Priority 4 (Lower):** Long-form PDFs, policy, facility assessment

## Integration Status

### Current Status
- ✅ Folder structure created
- ✅ Source registry created at `backend/src/vectorRag/ingestion/sourceRegistry.json`
- ✅ Markdown summaries location defined
- ✅ PDF/HTML locations staged
- ✅ KnowledgeCards.json remains in original location (NOT moved)
- ❌ Vector embeddings NOT YET created
- ❌ MongoDB vector models NOT YET created
- ❌ Vector RAG NOT YET integrated into patient flow

### What's NOT Changed
- `backend/src/rag/knowledgeCards.json` remains untouched and active
- Patient → Triage → Health Worker flow remains unchanged
- Rule engine, decision builder, LLM explanation, safety validator unchanged
- Existing JSON RAG behavior unchanged

### What's Ready for Future Implementation
- Source documents are staged and registered
- Metadata and audience restrictions are defined
- Priority ordering is established
- Guidance type restrictions are configured
- Once embeddings are created, vector RAG can be developed without touching live systems

## File Source Tracking

| File | Source | Status |
|------|--------|--------|
| knowledgeCards.json | MatriSense (original) | Active, Not moved |
| 01-08 markdown files | docs/rag-sources/summaries/ | Ready (copy when staging) |
| PDFs | docs/rag-sources/pdfs/ | Ready (copy when staging) |
| CDC HTML | docs/rag-sources/html/ | Ready (copy when staging) |

## Safety Notes

1. **KnowledgeCards.json is NOT copied or moved** - The original remains in `backend/src/rag/` for live JSON RAG
2. **Patient guidance restrictions are enforced** via sourceRegistry metadata
3. **All sources are marked `trusted: true`** because they come from curated, verified sources
4. **Audience restrictions** prevent worker-only or policy-only sources from appearing in patient guidance
5. **Vector ingestion is staged but not activated** - no changes to live systems until vector models are trained and validated

## Next Steps (Not in Scope)

When ready to implement Vector RAG:
1. Create vector embedding pipeline
2. Configure MongoDB vector search
3. Add `sourceRegistry.json` loader to ingestion service
4. Add vector retrieval to decision builder (alongside JSON RAG)
5. Add audience/guidance-type filter to output safety validator
6. Test with patient triage flow (non-breaking)
7. Deploy with feature flag or fallback to JSON RAG

---

**Created:** 2026-05-23  
**Last Updated:** 2026-05-23  
**Status:** Structure Ready | Vector Ingestion Pending
