# AI Layer

### Symptom Extraction
Patients report symptoms in natural Bangla. An LLM (Gemini or local) parses the text, extracts structured symptoms (symptom name, severity, duration), and provides an explanation (which words triggered which symptom codes). The frontend confirms extracted symptoms with the patient before proceeding.

### Clinical Triage
The rule engine applies evidence-based clinical rules (WHO guidelines, HEAR HER campaign, Bangladesh maternal health protocols) to classify risk level: LOW, MEDIUM, HIGH. Rules are human-readable and can be audited. No ML-based risk scoring (ensuring interpretability and clinical accountability).

### Rule-Aware RAG
Given the risk level and confirmed symptoms, a RAG service retrieves guidance from a knowledge base. Retrieval is filtered by rule: HIGH-risk cases cannot suggest home care; LOW-risk cases must include warning signs. Guidance is returned as structured cards (title, content, sources, evidence tags).

### LLM Explanation
The LLM generates human-friendly explanations: why these symptoms were extracted, why this risk level was assigned, why this guidance is recommended. Explanations are shown to both patients and health workers for transparency.

### Safety Validator
Before returning results to patients or health workers, a safety layer checks:
*   **No Diagnosis:** No specific disease diagnoses (e.g., "preeclampsia", "sepsis") are suggested—only symptom-based risk.
*   **No Prescription:** No specific drugs or dosages.
*   **No Risk Downgrade:** If rule engine assigns HIGH risk, guidance cannot suggest home care or downgrade to a lower level.
*   **LOW-Risk Must Warn:** LOW-risk cases must include a list of warning signs that trigger urgent care.
*   **Fallback Templates:** If any safety check fails, a safe fallback template is used instead of LLM-generated content.
