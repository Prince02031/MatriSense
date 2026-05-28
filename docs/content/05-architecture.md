# Architecture

![AI Architecture](/ai_architecture.png)

MatriSense uses a layered web architecture designed to keep AI language tasks separate from safety-critical triage decisions. The system uses LLMs for Bangla understanding, explanation, and guided conversation, while deterministic rules remain the source of truth for maternal risk classification.

### Frontend Layer
*   **Patient Panel:** Profile editor, symptom reporting, voice/text input, symptom confirmation, follow-up questions, result page, triage history, document uploads, and post-triage Guided Care Assistant.
*   **Health Worker Panel:** Dashboard, patient list, triage case list, case detail, status updates, referral notes, uploaded document review, district-based filtering, regional referral, and hospital assignment/reassignment.
*   **Admin Panel:** Documentation visibility controls, health-worker verification workflows, uploaded qualification review, and system/admin controls.
*   **Docs Page:** Judge-facing product, technical, safety, RAG, evidence, and architecture documentation.

### API Layer
*   **Auth API:** Login, registration, role-based access, and current-user checks.
*   **Patient API:** Patient profile, triage history, optional records, uploaded document references, and profile snapshots.
*   **Triage API:** Session creation, symptom extraction, confirmation, follow-up, rule execution, RAG-backed explanation, safety validation, and result retrieval.
*   **Guided Care Assistant API:** Post-triage assistant messaging using the current triage session, risk level, symptoms, follow-up answers, RAG context, assigned hospital data, and safety validation.
*   **Speech API:** Voice input transcription before user review/edit.
*   **Worker API:** Case list, case detail, status updates, patient list, risk/status filters, and district/upazila-based filtering.
*   **Referral / Hospital API:** Referral notes, seeded hospitals, same-district/nearby lookup, hospital assignment, reassignment, and assignment history.
*   **Docs API:** Documentation status, live stats, Markdown content, evidence file access, and technical documentation display.

### AI and Safety Layer
*   **LLM Extractor:** Converts Bangla symptom descriptions into structured symptoms, negations, severity clues, duration, and caseState fields.
*   **Follow-up Selector:** Chooses a small number of approved questions based on missing danger-sign or pregnancy-context information.
*   **Rule Engine:** Decides LOW, MEDIUM, or HIGH risk using structured case facts. The LLM does not decide urgency.
*   **Decision Builder:** Converts the rule result into risk level, matched rules, reasons, evidence tags, allowed guidance type, and safety/action boundaries.
*   **Vector RAG:** MatriSense currently uses Vector RAG as the main retrieval layer for maternal-health guidance. Curated summaries, knowledge-card content, selected PDFs, and HTML sources are embedded locally and searched through MongoDB Atlas Vector Search.
*   **JSON/Card RAG Fallback:** Curated JSON/Card guidance remains available as a deterministic fallback if vector retrieval fails, returns no safe chunks, or is disabled.
*   **Rule-aware Retrieval:** RAG retrieval is constrained by the rule-engine decision, symptoms, evidence tags, risk level, audience, guidance type, source kind, and trust metadata. RAG grounds guidance but cannot override triage risk.
*   **Explanation Service:** Uses the fixed rule-engine decision and retrieved RAG context to produce simple Bangla patient guidance.
*   **Guided Care Assistant:** Uses the completed triage result and existing RAG context to answer patient questions conversationally. It can provide emotional support, next steps, health-worker scripts, family messages, and hospital preparation guidance, but cannot diagnose, prescribe, downgrade risk, or advise unsafe delay.
*   **Safety Validator:** Blocks diagnosis, medicine dosage, risk downgrade, false reassurance, unsupported steps, missing disclaimer, and unsafe contradictions.

### RAG Implementation Details
*   **Embedding Provider:** Local embedding model.
*   **Embedding Model:** `Xenova/multilingual-e5-small`.
*   **Embedding Dimensions:** 384.
*   **Vector Store:** MongoDB Atlas Vector Search.
*   **Source Types:** Knowledge cards, curated Markdown summaries, selected PDFs, and HTML sources.
*   **Chunk Metadata:** `riskLevelAllowed`, `audience`, `guidanceTypes`, `symptoms`, `evidenceTags`, `sourceKind`, `sourceTitle`, `trusted`, and priority fields.
*   **Fallback Strategy:** Vector RAG first for source-grounded guidance; JSON/Card RAG or conservative templates if vector retrieval is unavailable or unsafe.
*   **GraphRAG Status:** GraphRAG-style retrieval is in development for the final round. It is not the primary stable path in the preliminary demo. The planned graph layer will connect symptoms, danger signs, evidence tags, risk levels, actions, guidance types, and sources to improve retrieval expansion/filtering while keeping the rule engine as the source of urgency.

### Data Layer
*   **MongoDB Collections:** Users, Patients, TriageSessions, ReferralNotes, AuditLogs, Hospitals, hospital assignment history, uploaded document references, worker coverage data, and DocsConfig where available.
*   **Vector Knowledge Store:** Embedded maternal-health chunks stored in MongoDB Atlas Vector Search with rule-aware metadata filters.
*   **Static/Curated Content:** Knowledge cards, source registry files, evidence references, docs Markdown files, curated summaries, and demo content.
*   **Referral Data:** Seeded hospitals, districts/upazilas, facility/service metadata, worker coverage areas, and referral workflow records.
*   **Consent-based Uploads:** Patient profile images, ID papers, prescriptions, certificates, and medical reports are optional and used for health-worker verification/referral support. Health-worker qualification documents are required for admin verification.