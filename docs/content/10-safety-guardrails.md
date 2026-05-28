# Safety Guardrails

MatriSense is designed as a triage and referral support tool, not a diagnosis or prescribing system. The safety layer protects the mother-facing output before it is shown.

### Core Validation Rules

1.  **No Diagnosis:** The system must not tell a mother that she has a specific disease. It may describe symptoms as warning signs or high-risk patterns.
2.  **No Prescriptions or Dosages:** The system must not recommend medicines, tablets, injections, or dosage instructions.
3.  **No Risk Downgrading:** If the rule engine assigns HIGH risk, the LLM cannot change it to MEDIUM or LOW.
4.  **No Home-Care-First Advice for HIGH Risk:** HIGH-risk cases must receive urgent contact/referral guidance, not “rest and wait” instructions.
5.  **LOW-Risk Must Include Warning Signs:** LOW-risk results can include self-care steps only when warning signs and escalation triggers are also shown.
6.  **Evidence-Bound Steps:** Patient-facing steps should come from retrieved guidance cards or fallback templates, not unsupported LLM invention.
7.  **Fallback Templates:** If the LLM output violates safety rules or fails, the system shows a predefined safe response based on risk level.
8.  **Human-in-the-Loop:** Health workers and doctors remain responsible for medical decisions, referral action, and follow-up.

### Why This Matters
Maternal health is sensitive and safety-critical. MatriSense uses the LLM for language understanding and explanation, while deterministic rules, retrieved guidance, and safety validation control the clinical boundary.
