# Vector RAG Source Structure - Implementation Complete

## Exact Files Changed/Created

### 1. Created Folder Structure
```
backend/data/rag/
├── source-documents/
│   ├── README.md (NEW)
│   └── md-files/ (NEW - for markdown summaries)
```

### 2. Created Configuration Files
```
backend/src/vectorRag/
└── ingestion/
    └── sourceRegistry.json (NEW)
```

## Files Created

| Path | Type | Purpose |
|------|------|---------|
| `backend/data/rag/source-documents/README.md` | Documentation | Explains folder structure and source classifications |
| `backend/src/vectorRag/ingestion/sourceRegistry.json` | Configuration | Master registry of all RAG sources with metadata |
| `backend/data/rag/source-documents/md-files/` | Directory | Placeholder for markdown summaries |

## Source Registry Details

The `sourceRegistry.json` contains 20 source entries:

### JSON Sources (Priority 1)
1. **knowledge_cards_json** - Original KnowledgeCards.json (unchanged location, remains live fallback)

### Markdown Sources (Priority 2-3) 
2. WHO Danger Signs Summary (patient-safe)
3. WHO PCPNC Quick Check (worker-only)
4. CDC HEAR HER Summary (patient-safe)
5. WHO ANC Digital Kit (admin/docs-only)
6. DGHS Bangladesh MNCH (patient-safe)
7. Bangladesh MNH Accreditation (worker-only)
8. Bangladesh National Strategy (admin/docs-only)
9. Rule Source Index (admin/docs-only)

### PDF Sources (Priority 2-4)
10. CDC HEAR HER PDF (patient-safe)
11. Warning Signs Poster Bengali (patient-safe)
12. NCBI High Risk (worker-only)
13. NCTB Counselling Sheets (worker-only)
14. WHO Antenatal Kit (worker-only)
15. Facility Readiness Checklist (admin-only)
16. MNH Accreditation Manual (admin-only)
17. Government Strategy (admin/docs-only)

### HTML Sources (Priority 2)
18. CDC HEAR HER HTML (patient-safe)

## Source Locations

### Patient-Safe Sources (For Patient Guidance)
✅ Can use these in patient output:
- `backend/src/rag/knowledgeCards.json` (original location, JSON RAG)
- `backend/data/rag/source-documents/md-files/01_who_counselling_danger_signs_summary.md`
- `backend/data/rag/source-documents/md-files/03_cdc_hear_her_urgent_maternal_warning_signs_summary.md`
- `backend/data/rag/source-documents/md-files/05_dghs_bangladesh_mnch_anc_job_aid_summary.md`
- `backend/data/rag/source-documents/CDC-Hear-Her-Womens-urgent-warning-signs-h.pdf`
- `backend/data/rag/source-documents/Warning-Signs-Poster_LTR_whitebkg_Bengali.pdf`
- `backend/data/rag/source-documents/cdc-hear-her-warning-signs.html`

### Worker/Admin/Docs-Only Sources (NOT for Patient Guidance)
❌ Restrict to worker/admin/documentation only:
- `backend/data/rag/source-documents/md-files/02_who_pcpnc_quick_check_rapid_assessment_summary.md` (worker-only, limited patient context)
- `backend/data/rag/source-documents/md-files/04_who_anc_digital_adaptation_kit_summary.md` (architecture/docs)
- `backend/data/rag/source-documents/md-files/06_bangladesh_mnh_service_accreditation_summary.md` (facility standards)
- `backend/data/rag/source-documents/md-files/07_bangladesh_national_strategy_maternal_health_2019_2030_summary.md` (policy/system context)
- `backend/data/rag/source-documents/md-files/08_rule_source_index_for_agents.md` (internal reference)
- `backend/data/rag/source-documents/NCBI_bookshelf_high_risk.pdf` (clinical reference)
- `backend/data/rag/source-documents/NCTB_information_and_counselling_sheets_high_risk.pdf` (worker guidance)
- `backend/data/rag/source-documents/WHO-Antinatal-kit.pdf` (clinical/implementation)
- `backend/data/rag/source-documents/Checklist-04-Facility-Readiness.pdf` (facility assessment)
- `backend/data/rag/source-documents/MNH-Service-Accreditation-Manual_Clean_Cor-14-4-23.pdf` (facility standards)
- `backend/data/rag/source-documents/government_Strategy.pdf` (policy context)

## Guidance Types Mapping

### Patient-Safe Guidance Types
- `URGENT_ESCALATION` - When to seek immediate care
- `CONTACT_HEALTH_WORKER` - When to contact health worker
- `SELF_CARE_AND_MONITOR` - Self-care steps and monitoring
- `WARNING_SIGNS` - Signs requiring action
- `SAFETY_DISCLAIMER` - Important disclaimers
- `FOLLOW_UP_QUESTION` - Follow-up assessment

### Worker/Admin Guidance Types
- `HEALTH_WORKER_REVIEW` - For worker decision-making
- `REFERRAL_WORKFLOW` - Referral procedures
- `FACILITY_READINESS` - Facility capabilities/standards
- `SYSTEM_CONTEXT` - System architecture and policy
- `DIGITAL_HEALTH_ARCHITECTURE` - Technical implementation

## Data Flow & Integration Status

### ✅ COMPLETE (No Changes to Live Systems)
- Folder structure created
- Source registry defined with metadata
- Patient safety restrictions configured
- Source priority ordering established
- Documentation created

### ❌ NOT IMPLEMENTED (Future Work)
- Vector embeddings (no new packages installed)
- MongoDB vector models (not created)
- Vector retrieval pipeline (not built)
- Integration with decision builder (not modified)
- Patient flow remains unchanged

### 🔒 PROTECTED (Not Modified)
- `backend/src/rag/knowledgeCards.json` (original location, active JSON RAG)
- Patient → Triage → Health Worker flow
- Rule engine
- Decision builder
- LLM explanation generator
- Safety validator

## How to Use This Structure

### For Vector RAG Development (Future)
1. Source documents are registered in `sourceRegistry.json`
2. Create embedding service that reads registry
3. Embed documents based on `sourceKind` (MARKDOWN, PDF, HTML)
4. Store vectors in MongoDB with metadata
5. Add audience/guidance-type filters to retrieval
6. Integrate with decision builder as optional augmentation to JSON RAG

### For Safety Validation
1. Check `audiences` field to ensure source is appropriate
2. Check `allowedGuidanceTypes` to match output type
3. Check `restrictedPatientContext` flag before patient output
4. Use `priority` ordering for source ranking in retrieval

### For Documentation & Maintenance
- Reference `sourceRegistry.json` for source status
- Use `README.md` in source-documents folder for team guidance
- Check `trusted` flag for source reliability
- Review `evidenceTag` for evidence mapping

## Key Design Decisions

1. **KnowledgeCards.json Not Moved** - Original location unchanged to preserve live JSON RAG dependency
2. **Registry-Based Architecture** - Single source of truth for document metadata
3. **Explicit Audience Restrictions** - Prevent worker/admin sources from leaking into patient guidance
4. **Priority-Ordered** - Enables fallback and source ranking in retrieval
5. **Guidance Type Mapping** - Ensures output matches source capability
6. **Lazy Ingestion** - Source documents staged but not embedded yet

---

**Status:** Structure Ready | Vector Ingestion Not Yet Implemented  
**Created:** 2026-05-23  
**No live systems modified**
