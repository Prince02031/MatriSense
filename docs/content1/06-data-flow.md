# Data Flow

The lifecycle of a maternal assessment, from initial symptom description by the mother in Bangla to hospital referral delivery and health worker follow-up:

1.  **Symptom Entry:** Patient reports their current symptoms in natural Bangla text.
2.  **AI Parsing:** LLM client extracts structured symptom codes and provides natural language explanation of key triggers.
3.  **Extraction Confirmation:** Mother confirms or edits the structured symptom set.
4.  **Triage Assessment:** Rule engine maps the patient's state to clinical danger-sign criteria (LOW, MEDIUM, HIGH risk).
5.  **RAG Context Assembly:** Context-specific care cards are retrieved from the evidence base matching symptom and risk filters.
6.  **Guidance Generation:** LLM generates localized warm Bangla guidance utilizing the retrieved cards as strict ground-truth.
7.  **Safety Filter:** The safety validator checks the response to ensure no diagnosis or drugs are mentioned, and that warnings are present.
8.  **Result Display:** Mother sees the safe results, emergency disclaimer, warm instructions, and quick reply actions.
9.  **Case Queue Update:** The case immediately registers on the assigned clinic health worker's dashboard.
10. **Worker Review:** Health worker inspects the detailed symptoms, AI explanation, map coordinates, and nearby facilities.
11. **Hospital Referral:** Worker assigns a specific hospital and triggers a digital referral note.
12. **Notification Delivery:** Referral details are delivered in real time to the patient's dashboard.
13. **Patient Acknowledgment:** Patient confirms the referral or presses the call button, completing the loop on the worker dashboard.
