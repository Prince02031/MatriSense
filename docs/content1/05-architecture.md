# Architecture

MatriSense follows a highly secure, scalable, and modular layered architecture to ensure reliable performance both online and in future offline environments.

### Frontend Layer (Next.js & React)
*   **Patient Triage Portal:** Captures Bangla symptoms, handles confirmation workflows, shows dynamic guidelines.
*   **Health Worker Dashboard:** Consolidated view of community cases, details, location maps, hospital referrals, and note logs.
*   **Admin Dashboard:** Toggles documentation status, schedule settings, and system-wide verification controls.

### API Layer (Express.js & Node)
*   **Authentication Service:** Role-based access controls (patient, worker, admin) with JWT security.
*   **Triage Gateway:** Manages active triage sessions, captures patient symptoms and follow-up questionnaire snapshot records.
*   **Worker/Hospital Endpoints:** Powers case filtering, status updates, and Haversine-based nearby hospital searches.

### Service Layer (AI & Safety)
*   **LLM Client Service:** Handles connections to Google Gemini (or local model fallback interfaces) for parsing text.
*   **Clinical Rule Engine:** Executes deterministic rule checks based on WHO and Bangladesh local clinical guidelines.
*   **RAG Evidence Service:** Retrieves matched care guidance cards filtered strictly by decision criteria and risk level.
*   **Safety Validator:** Independent post-generation filter inspecting the prompt outputs for blocked drug/diagnostic references.

### Data Layer (MongoDB)
*   **Persistent Collections:** Users, Patients, TriageSessions, Hospitals, ReferralNotes, DocsConfigs, AuditLogs.
