# AI Layer

MatriSense uses AI for Bangla language understanding, explanation, retrieval grounding, voice accessibility, and post-triage conversation. It does not use AI as the source of medical urgency. The deterministic rule engine remains responsible for LOW / MEDIUM / HIGH risk classification.

### Symptom Extraction

Patients report symptoms in natural Bangla text or voice-transcribed text. The LLM extracts structured symptoms, severity clues, duration, negations, pregnancy context, and uncertain fields into a normalized `caseState`.

Voice input is transcribed into editable text first. The user can review or correct the transcript before submitting. The mother also confirms extracted symptoms before final triage continues.

The extraction layer may use keyword or rule-based fallback logic for demo reliability, but extraction does not decide medical risk.

### Follow-up Logic

Follow-up questions are selected from an approved question bank rather than generated freely. The system asks only a small number of questions that can affect risk interpretation, such as:

*   blurred vision with headache
*   bleeding with abdominal pain
*   repeated vomiting
*   difficulty breathing
*   fainting or convulsions
*   swelling
*   reduced fetal movement
*   fever or severe weakness

Follow-up answers update the structured case state before rule execution.

### Clinical Triage

The rule engine receives structured case facts, not raw Bangla text. It checks maternal danger signs, pregnancy stage, follow-up answers, and profile context where available to classify urgency as LOW, MEDIUM, or HIGH.

The rule engine is the safety-critical decision layer. The LLM, Vector RAG, Guided Care Assistant, and voice features are not allowed to decide urgency, downgrade risk, or contradict the rule result.

### Decision Builder

The decision builder converts rule-engine output into a structured decision package containing:

*   risk level
*   matched rules
*   reasons
*   evidence tags
*   allowed guidance type
*   safety/action boundaries
*   profile-aware modifiers where available
*   health-worker notes where relevant

This decision package controls what the retrieval and explanation layers are allowed to use.

### Rule-Aware Vector RAG

MatriSense currently uses Vector RAG as the main retrieval layer for maternal-health guidance. Curated maternal-health summaries, knowledge-card content, selected PDFs, and HTML sources are chunked, embedded locally, and stored in MongoDB Atlas Vector Search.

The current embedding model is `Xenova/multilingual-e5-small` with 384-dimensional vectors.

Each vector chunk includes metadata such as:

*   `riskLevelAllowed`
*   `audience`
*   `guidanceTypes`
*   `symptoms`
*   `evidenceTags`
*   `sourceKind`
*   `sourceTitle`
*   `trusted`
*   priority fields

Retrieval is constrained by the rule-engine decision, symptoms, evidence tags, risk level, audience, and allowed guidance type. RAG can ground explanation, but it cannot override triage risk.

### JSON/Card RAG Fallback

Curated JSON/Card guidance remains available as a deterministic fallback. If vector retrieval fails, returns no safe chunks, or is disabled, the system can fall back to JSON/Card guidance and then to conservative safety templates.

This keeps patient guidance reliable even when vector retrieval is unavailable.

### GraphRAG-Style Retrieval Status

GraphRAG-style retrieval is being developed for the final round, but it is not the primary stable path in the preliminary demo. The stable pipeline is rule-aware Vector RAG with JSON/Card fallback.

The planned graph layer will connect symptoms, danger signs, evidence tags, risk levels, actions, guidance types, and sources to improve retrieval expansion and filtering. It will remain a retrieval-support layer only. The rule engine will still decide urgency.

### LLM Explanation

The LLM explains the fixed rule-engine decision and retrieved RAG context in simple Bangla. It can summarize next steps, warning signs, referral urgency, and what the patient should communicate to a health worker.

It must not:

*   diagnose disease
*   prescribe medicine
*   suggest dosage
*   downgrade risk
*   advise unsafe delay
*   invent unsupported medical steps
*   contradict the rule engine

### Guided Care Assistant

After the result page, the post-triage Guided Care Assistant can answer patient questions conversationally. It uses the current triage session, risk level, symptoms, follow-up answers, RAG context, assigned hospital data, and limited history where available.

It can help with:

*   explaining the result
*   emotional support
*   next steps
*   what to tell a health worker
*   family messages
*   hospital preparation
*   safe casual conversation with redirection to the health context

It cannot diagnose, prescribe, downgrade risk, or advise delaying care for HIGH-risk cases. Every assistant answer is checked by the safety validator.

### Safety Validator

Before patient-facing output is shown, the safety validator checks for:

*   diagnosis
*   medicine or dosage advice
*   false reassurance
*   risk downgrade
*   unsafe delay
*   unsupported steps
*   missing or incorrect safety disclaimer
*   contradiction of the rule-engine decision

If the output is unsafe, the system repairs minor issues such as missing disclaimer where appropriate, or returns a conservative fallback based on the rule-engine risk level.