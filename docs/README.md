# MatriSense Documentation

This folder contains the human-readable project documentation, RAG source archive, feature specifications, and submission support notes for MatriSense.

## Folder Map

```text
docs/
├── features/
│   └── regional-referral/     # Region-based health worker workload and hospital assignment feature
├── rag/                       # Vector RAG plans, prompts, and source metadata
├── rag-sources/               # Curated source materials for RAG review/ingestion
│   ├── structured/            # Existing structured JSON knowledge cards
│   ├── summaries/             # Curated markdown summaries; preferred MVP ingestion source
│   ├── pdfs/                  # Raw PDF references
│   └── html/                  # Saved CDC HEAR HER HTML source and assets
└── submission/                # Short notes for final presentation/submission
```

## Important Runtime Note

The `docs/rag-sources` folder is the project documentation/source archive. The backend ingestion pipeline may later copy selected files into `backend/data/rag/sources` for actual Vector RAG ingestion.

## Safety Rule

Vector RAG must not decide medical risk. MatriSense keeps risk classification inside the rule engine. Vector RAG only retrieves supporting guidance/evidence compatible with the rule-engine decision, and the existing JSON-aware RAG must remain as fallback.
