# Product Overview

### Mother Side & Interactive Chatbot Referral
A mother or family caregiver creates a basic pregnancy profile, reports symptoms in Bangla, and confirms extracted symptoms before receiving a rule-based triage risk level (LOW/MEDIUM/HIGH). Post-triage, she can interact with the **AI Guided Care Assistant**, a stateful chatbot that:
*   Explains triage urgency and recommended next steps without diagnosing.
*   Enables location-based hospital searches directly within the chat.
*   Allows the mother to select and submit a preferred hospital for regional referral coordination.
*   Presents a visual map showing facility locations, services, and distances.

### Multimodal Medical Document Intelligence
To turn unstructured paper records into digital clinical data, MatriSense includes an experimental multimodal pipeline:
*   **AI-Assisted Document Reading:** Mothers upload photos of medical reports (lab tests, prescriptions, ultrasound scans, blood pressure log cards). Gemini Vision extracts key values (systolic/diastolic BP, hemoglobin, blood sugar, urine protein, etc.).
*   **Deterministic Severity Checking:** Extracted values are passed through a deterministic maternal safety validator. Color-coded badges (✅ NORMAL, ⚠️ WARNING, 🚨 CRITICAL) flag values against pregnancy-specific thresholds (e.g., blood pressure ≥ 140/90 mmHg).
*   **Interactive Review Chat:** A document-scoped AI chat assistant allows mothers to review and correct any readings, which are then saved as unified `ClinicalDataPoints` and integrated into the triage pipeline.
*   **Longitudinal History & Trends:** Dynamic charts display historical trends of recorded clinical parameters over time.

### Health Worker Side & Outreach
Field-level health workers access a structured dashboard, bypassing unstructured messaging. The health worker case detail page features a **tabbed layout** (Overview, Triage Review, Documents, Clinical Data, Recommendations, Referral & Hospital, Notes & Audit). Health workers can view patient triage logs, historical cases, risk tags, matching RAG evidence, review patient-preferred hospital selections, view uploaded patient documents, and monitor clinical history trends.

### Security, Consent & Privacy
To protect rural mothers, MatriSense enforces strict privacy-by-design guidelines:
*   **Consent-Gated Clinical Access:** Health workers can only view patient documents and clinical data trends if the patient's "share with health worker" consent toggle is enabled. If consent is disabled, the worker's views show a "Consent Not Granted" placeholder.
*   **Cascading Clinical Data Deletion:** Deleting an uploaded document allows patients to optionally cascade-delete all clinical data points (BP, hemoglobin, etc.) derived from that document to prevent residual tracking.
*   **Voice Privacy:** Voice-to-text symptom reporting transcribes audio on-the-fly via secure Groq Whisper endpoints, discarding raw audio files immediately.
*   **Access Control:** Strict role-based JWT authentication isolates patient profiles, health worker dashboards, and administrator pages.
*   **Verification Gatekeeping:** Health-worker account activations require manual document verification by system administrators before clinical case data can be viewed.

### Regional Referral Workflow
Regional referral support is driven by a custom Model Context Protocol (MCP) server that hooks into MongoDB. It enables real-time lookup of regional hospitals, filters patients by upazila/district, and records audit logs for hospital assignments. The frontend map client matches patient geolocations to seeded clinics to recommend the closest eligible facility.
