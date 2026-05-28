# Safety Guardrails

To ensure absolute patient safety, the MatriSense system wraps all LLM generations in an independent multi-check validation layer.

### Core Validation Rules

1.  **No Clinical Diagnosis:** Output must never suggest a specific disease diagnosis (e.g., "sepsis", "preeclampsia"). It must limit terms to symptom-based risk and danger signs.
2.  **No Prescriptions or Dosages:** The system is strictly blocked from recommending any specific medicines or pharmaceutical dosages (e.g., "aspirin", "500mg paracetamol"). Only safe physical advice (e.g., "lie on your left side", "drink clean water") or clinical referrals are permitted.
3.  **No Risk Downgrading:** If the deterministic rule engine assigns a HIGH risk level, the generated care guidance is strictly prohibited from suggesting home care, self-treatment, or lower risk status.
4.  **LOW-Risk Must Warn:** Every LOW-risk triage result must explicitly list crucial warning signs that require urgent emergency hospital visitation.
5.  **Bangla Language and Disclaimer Check:** Generated Bangla outputs must contain the official safety disclaimer: `রেজিস্টার্ড চিকিৎসকের পরামর্শ নিন।` (Consult a registered doctor).
6.  **Fail-Safe Templates:** If any of the above checks are triggered or the LLM fails to respond, the system immediately rejects the output and serves a statically defined fallback template corresponding to that risk level.
7.  **Human-in-the-Loop:** Health workers verify case files. AI supports and guides, but humans execute clinical actions.
