# RAG Strategy

### Current MVP: Rule-Aware Guidance Cards & Evidence Tags
Guidance is currently stored as structured JSON cards with metadata: symptom codes, risk level (LOW/MEDIUM/HIGH), evidence tags, and guidance type (home-care, clinic-visit, urgent-referral). 

*   **RAG does not decide urgency:** The deterministic clinical rule engine evaluates the patient's symptoms and case state to decide the risk level (LOW/MEDIUM/HIGH).
*   **LLM only explains the fixed decision:** Once the rule engine locks the risk level, matching guidance cards are retrieved. The LLM only acts to translate and explain this fixed triage decision using the retrieved ground-truth guidance chunks.
*   **Evidence Library integration:** Our Evidence Library displays the public references (like WHO ANC guidelines, CDC HEAR HER) and internal summaries that were directly used to curate these hardcoded cards.

### In Progress: Vector RAG with Metadata Filtering
We are actively building a Vector RAG upgrade:
*   Embed authoritative maternal guideline chunks into a vector database (e.g., Chroma or Weaviate) using multilingual embeddings (such as `multilingual-e5`).
*   Query using the mother's reported symptom context.
*   Apply strict metadata pre-filtering (such as risk level range, trimester, symptom codes) so vector search never overrides safe triage rules (e.g., HIGH-risk cases will never retrieve self-care chunks).

### Future Roadmap: GraphRAG
We plan to introduce **GraphRAG** (targeted for Q3 2026):
*   Create a clinical knowledge graph connecting: `Symptom` ➔ `Danger Sign` ➔ `Triage Rule` ➔ `Risk Level` ➔ `Allowed Action` ➔ `Evidence Source`.
*   Enables multi-hop reasoning over complex multi-symptom histories.
*   Enables cross-case diagnostic alignment while keeping clinical rules as the structural backbone of reasoning.
