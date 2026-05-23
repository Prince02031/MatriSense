# MatriSense RAG Documentation

This folder contains the planning material for MatriSense Vector RAG.

## Files

- `Vector_RAG_Source_Verdict_Metadata_Plan.md` — source-by-source verdict and metadata strategy.
- `Vector_RAG_Source_Registry_Draft.json` — draft registry for structured cards, markdown summaries, PDFs, and HTML sources.
- `Vector_RAG_Revised_Agent_Prompts.md` — revised agent prompt sequence for implementing reusable, source-agnostic, fallback-safe Vector RAG.

## Recommended Ingestion Priority

1. Existing `KnowledgeCards.json`
2. Curated markdown summaries
3. CDC HEAR HER HTML/PDF/poster
4. Raw guideline PDFs with restricted metadata and audience filtering

## Runtime Fallback

Vector RAG is optional and quota-dependent. The app must always fall back to the existing JSON-aware RAG if Gemini embeddings, vector search, or PDF ingestion fail.

## Safety Boundary

The rule engine decides `LOW`, `MEDIUM`, or `HIGH`. Vector RAG retrieves only metadata-compatible chunks and must never override the rule-engine decision.
