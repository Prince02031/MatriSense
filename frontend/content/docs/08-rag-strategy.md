# RAG Strategy

### Current MVP: Rule-Aware Vector RAG with Metadata Filtering

MatriSense currently uses Vector RAG as the main retrieval strategy for maternal-health guidance. Curated guideline summaries, knowledge-card content, selected PDFs, and HTML sources are ingested into a vector knowledge store. Each chunk is embedded using a local multilingual embedding model and stored with strict metadata such as symptoms, evidence tags, allowed risk levels, audience, guidance type, source kind, trust level, and source title.

The rule engine first decides the fixed triage risk level and allowed guidance boundary. Vector RAG then retrieves only guidance that matches that decision package. This means retrieval is semantic, but still safety-controlled.

*   **Vector RAG is the active guidance retrieval layer:** The system retrieves relevant maternal-health chunks using semantic search plus metadata filters.
*   **RAG does not decide urgency:** The rule engine decides LOW, MEDIUM, or HIGH risk.
*   **Metadata filters enforce safety:** Retrieved chunks must match risk level, guidance type, symptoms, evidence tags, and intended audience.
*   **LLM only explains the fixed decision:** The LLM receives the rule-engine decision and retrieved RAG context, then produces Bangla guidance within those boundaries.
*   **JSON/Card fallback remains available:** If vector retrieval fails or no safe chunks pass filtering, the system can fall back to curated JSON/Card guidance or conservative safety templates.
*   **Evidence Library connection:** The Evidence Library shows public references and internal summaries used to design the source registry, rules, RAG metadata, and safety constraints.

### Retrieval Safety Rules

*   HIGH-risk cases retrieve urgent escalation and health-worker/referral guidance only.
*   MEDIUM-risk cases retrieve health-worker contact guidance, warning signs, and safe monitoring instructions.
*   LOW-risk cases may retrieve self-care and monitoring guidance, but must include escalation triggers.
*   Retrieved guidance must avoid diagnosis, medicine dosage, false reassurance, unsupported home remedies, and risk downgrade.
*   RAG can support explanation and grounding, but it cannot override the rule-engine risk level.

### Current Vector RAG Implementation

MatriSense uses local multilingual embeddings for cost and reliability. The current embedding model is `Xenova/multilingual-e5-small` with 384-dimensional vectors. Vector chunks are stored and searched through MongoDB Atlas Vector Search.

The retrieval query combines:

*   raw Bangla symptom text
*   extracted symptoms
*   evidence tags
*   risk level
*   allowed guidance type
*   pregnancy/profile context where available
*   intended audience, such as PATIENT or HEALTH_WORKER

This makes the RAG layer both semantic and rule-aware.

### In Progress: GraphRAG-Style Retrieval

GraphRAG-style retrieval is currently being developed for the final round, but it is not the primary stable path in the preliminary demo. The current stable pipeline is rule-aware Vector RAG with JSON/Card fallback.

The planned graph layer will connect:

`symptom` → `danger sign` → `triage rule` → `risk level` → `allowed action` → `guidance type` → `evidence source`

This graph layer will improve retrieval expansion, filtering, and explainability. It will remain a retrieval-support layer only. The deterministic rule engine will still decide urgency.

### Future Roadmap

Future RAG improvements include stronger graph-aware retrieval, contextual chunk summaries before embedding, richer source provenance display, better health-worker-facing evidence views, and expanded metadata support for profile-aware rule modifiers such as age, known risk factors, pregnancy stage, checkup gaps, and referral context.