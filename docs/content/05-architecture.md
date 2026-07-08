# Architecture

MatriSense uses a layered web architecture designed to isolate generative language tasks from safety-critical triage decisions. Deterministic rule checks serve as the clinical source of truth, while LLMs assist with Bangla symptom extraction, natural-language explanation, and stateful care coordination.

### Previously (Preliminary Version)
![Previously (Preliminary Version)](/ai_architecture.png)

### For Final Round (Current Build)
![For Final Round](/ai_architecture_final_2_clear.png)

### Frontend Layer
*   **Patient Portal:** Bangla symptom input (speech/text), extraction verification, danger-sign follow-up questionnaires, and a result page. Includes the **8-Step Guided Care Assistant** panel with an interactive clinic/hospital search, map viewer, and hospital preference submission. Features the **Uploaded Documents** page and **My Clinical Data** (longitudinal trends and charts) page, with a **Review Chat** panel.
*   **Health Worker Dashboard:** Filterable triage inbox, patient dossiers, GPS location maps, and clinical audit records. Enables workers to review RAG evidence logs and manage regional referral hospital assignments. Updated with a **tabbed case detail layout** displaying the patient's documents and clinical data history.
*   **Admin Control Console:** Security config triggers to control public documentation visibility, along with credentials review dashboards for health worker verification.
*   **Docs Portal:** Live system documentation pages, API indexes, and clinical evidence library.

### API Layer
*   **Auth API:** Role-based JWT session security (Patient, Health Worker, Admin).
*   **Patient API:** Health profile snapshots, upload consent records, and triage history.
*   **Triage API:** Multi-stage symptom ingestion, structured confirmation steps, and danger-sign questionnaires.
*   **Document Analysis API:** Multi-format document upload (NID, prescriptions, lab reports, ultrasound cards), Gemini Vision parsing, maternal threshold checks, and `ClinicalDataPoint` persistence.
*   **Guided Care Assistant API:** Multi-step chat orchestrator leveraging triage sessions, RAG contexts, and assigned hospital capacities.
*   **Speech API:** Audio transcription wrapper matching the client-side voice recorder.
*   **Referral & Hospital API:** Hospital registries, same-district location filtering, and reassignment log audits.
*   **Docs API:** Dynamic markdown loader, config status checks, and evidence file downloads.

### AI and Safety Layer
*   **LLM Extractor:** Translates raw Bangla symptom descriptions into structured clinical codes and negate/duration tags.
*   **Gemini Vision Analyzer:** Extracts medical parameters and text from images and handwritten documents, validating outputs using deterministic clinical thresholds.
*   **Follow-up Selector:** Queries danger-sign logic tables to present targeted follow-up options.
*   **Rule Engine (`json-rules-engine`):** Evaluates case state inputs against clinical rules to output LOW/MEDIUM/HIGH risk levels. The LLM cannot override or calculate this risk.
*   **Decision Builder:** Packages rule outputs, evidence tags, allowed guidance scopes, and safety boundaries.
*   **Safety Validator:** Post-process guardrail that intercepts LLM outputs, preventing diagnosis, dosage advice, or risk contradictions, utilizing hard-coded fallback templates when safety checks are triggered.

### Model Context Protocol (MCP) Server Layer
Standardizes tool-calling interfaces between AI layers and database collections via two custom servers:
*   **`matrisense-case-context-mcp`:** Exposes 6 tools for fetching active triage sessions, pregnancy details, and clinical boundaries.
*   **`matrisense-referral-mcp`:** Exposes 15 tools for coordinate-based hospital lookup, tracking patient preferences, and managing assignment histories.

### RAG and Knowledge Retrieval
*   **Vector RAG:** Matches symptom codes to text embeddings of WHO, HEAR HER, and local maternal guidelines using `Xenova/multilingual-e5-small` (384 dimensions) in MongoDB Atlas.
*   **JSON/Card RAG Fallback:** Secure local database lookup providing deterministic fallback guidance if vector search is unavailable.
*   **Graph RAG (Final Round Integration):** A semantic relational network connecting symptom nodes to specific danger signs, rules, actions, and source guidelines. Allows multi-hop graph traversal to expand retrieval scope while keeping risk classification deterministic.

### Data Layer
*   **Database (MongoDB):** Standardized schemas for Users, Patients, TriageSessions, ReferralNotes, AuditLogs, and Seeded Hospitals.
*   **Vector & Graph Stores:** Metadata-tagged vector collections and graph lookup structures supporting structured, rule-constrained context retrieval.