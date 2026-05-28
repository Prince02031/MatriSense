# Data Flow

The MatriSense triage journey turns a Bangla symptom report into a structured maternal-health case for the patient, health worker, and referral workflow.

### Patient Intake

1.  **Profile Context:** The system loads available pregnancy profile data such as trimester, gestational week, known risk factors, last checkup date, age, contact details, district/upazila/address, optional location, and consent-based uploaded documents.

2.  **Consent-Based Documents:** Patients may optionally upload profile images, ID papers, prescriptions, certificates, or previous medical reports. These documents support health-worker verification and referral review. They are not used as autonomous diagnosis inputs.

3.  **Symptom Entry:** The patient reports symptoms in Bangla text or voice. Voice input is transcribed into editable text first, and the user can review or correct it before submitting.

4.  **AI Extraction:** The LLM converts Bangla input into structured symptoms, severity clues, duration, negations, pregnancy context, and uncertain fields. Keyword/rule fallback may support reliability if extraction fails.

5.  **Human Confirmation:** The patient confirms or edits the extracted symptoms before final triage logic runs.

### Triage Processing

6.  **Follow-up Questions:** The system asks a small number of approved follow-up questions for missing danger-sign information.

7.  **Case State Builder:** Profile context, confirmed symptoms, severity, duration, negations, and follow-up answers are combined into one structured case state.

8.  **Rule Engine:** Deterministic maternal danger-sign rules classify risk as LOW, MEDIUM, or HIGH. The LLM does not decide urgency.

9.  **Decision Builder:** Rule events are merged into a final decision package with risk level, reasons, matched rules, evidence tags, allowed guidance type, safety boundaries, and health-worker notes.

### Guidance Generation

10. **Rule-Aware Vector RAG:** MatriSense uses Vector RAG as the main retrieval layer. Curated maternal-health chunks are retrieved from MongoDB Atlas Vector Search using local `Xenova/multilingual-e5-small` embeddings with 384-dimensional vectors.

11. **Metadata Filtering:** Retrieval is constrained by risk level, symptoms, evidence tags, audience, guidance type, source kind, and trust metadata. RAG can ground guidance, but cannot override the rule-engine decision.

12. **JSON/Card Fallback:** If Vector RAG is unavailable or no safe chunks pass filtering, the system falls back to curated JSON/Card guidance and then to conservative safety templates.

13. **LLM Explanation:** The LLM turns the fixed rule-engine decision and retrieved RAG context into simple Bangla patient guidance.

14. **Safety Validation:** The output is checked for diagnosis, medicine dosage, risk downgrade, false reassurance, unsafe delay, unsupported claims, and missing disclaimer. Unsafe output is repaired or replaced with a safe fallback.

15. **Patient Result:** The patient sees risk level, reasons, warning signs, next steps, referral urgency, and safety disclaimer.

### Post-Triage Assistant Flow

16. **Assistant Entry:** From the result page, the patient can open the Guided Care Assistant.

17. **Assistant Context Builder:** The assistant loads official context from the backend, including current triage session, risk level, symptoms, follow-up answers, RAG context, assigned hospital data, and limited past summaries where available.

18. **Conversational Response:** The assistant answers in Bangla with emotional support, practical next steps, health-worker scripts, family messages, or hospital preparation guidance.

19. **Assistant Safety Check:** Every assistant reply passes safety validation. For HIGH-risk cases, the assistant must preserve urgent health-worker or health-center contact as the primary action.

20. **Voice Accessibility:** Voice input fills the chat input as editable transcript before sending. Voice output can read assistant replies aloud.

### Health Worker and Referral Flow

21. **Health Worker Case:** Relevant cases appear in the health-worker dashboard with patient profile snapshot, raw symptom input, extracted symptoms, follow-up answers, matched rules, RAG guidance, safety status, and result summary.

22. **District Filtering:** Worker case lists can be filtered by risk level, status, district, upazila, and worker coverage.

23. **Referral Notes:** Health workers can add notes and update case status.

24. **Hospital Lookup:** The system uses seeded hospital, district/upazila, facility, and service data to support regional referral review.

25. **Hospital Assignment:** Health workers manually assign or reassign hospitals. Assignment history and status changes are stored for auditability.

26. **Exports:** Case/result summaries can be exported as PDF or image where enabled.

### Admin and Verification Flow

27. **Health Worker Verification:** Health workers upload essential qualification documents. Admin review verifies whether they are eligible/registered before full access.

28. **Docs and Evidence:** The docs page displays architecture, RAG strategy, AI layer, data flow, safety boundaries, evidence sources, and demo guidance.

### Data Persistence

29. **MongoDB App Data:** Users, patient profiles, triage sessions, worker cases, referral notes, hospitals, assignments, audit/status history, uploaded document references, and docs configuration are stored in MongoDB.

30. **Vector Knowledge Store:** Embedded maternal-health chunks and retrieval metadata are stored in MongoDB Atlas Vector Search.

31. **Local UI Memory:** Guided Care Assistant chat history is stored temporarily in frontend localStorage for UI persistence only. Official medical context always comes from backend records.