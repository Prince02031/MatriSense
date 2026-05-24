# Vector RAG Local Embedding Guide

This backend keeps JSON RAG as the safe default and uses local embeddings for Vector RAG support.

## Why local embeddings
- Gemini/Google embedding API reliability can block ingestion/retrieval.
- Local model removes external API dependency for embedding generation.
- Medical safety behavior is unchanged: rule engine still decides `LOW`/`MEDIUM`/`HIGH`.
- Vector RAG remains evidence retrieval only and falls back to JSON RAG when needed.

## Default local embedding config
Set in `backend/.env`:

```env
RAG_MODE=json
EMBEDDING_PROVIDER=local
EMBEDDING_MODEL=Xenova/multilingual-e5-small
EMBEDDING_DIMENSIONS=384
```

Notes:
- Keep `RAG_MODE=json` until smoke tests pass.
- If you switch embeddings later (for example Gemini), re-ingest all chunks and rebuild vector index with matching dimensions.

## Run local embedding test
```bash
cd backend
npm run rag:embedding:test
```

Expected:
- provider: `local`
- model: `Xenova/multilingual-e5-small`
- dimensions: `384`

## Run local vector smoke test
```bash
cd backend
npm run rag:local-smoke
```

The smoke test checks:
- local embedding generation works
- embedding dimension is 384
- source registry loads
- ingestion dry-run works
- retrieval preview runs if DB chunks exist

## Ingestion
Dry-run (no DB writes, no local model call):
```bash
cd backend
npm run rag:ingest -- --dry-run
```

Normal ingestion:
```bash
cd backend
npm run rag:ingest
```

Behavior:
- ingestion uses `EmbeddingClient` with `inputType: passage`
- if embedding fails for a chunk, ingestion logs and continues where safe
- `EMBEDDING_PROVIDER=none` allows dry-style runs without embeddings

## Retrieval
- query embedding uses `inputType: query`
- on embedding failure, retriever returns `fallbackRecommended=true`
- caller should continue with existing JSON RAG fallback

## MongoDB Atlas vector index (384 dims)
Create/update the Atlas Search vector index with this shape:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 384,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "riskLevelAllowed"
    },
    {
      "type": "filter",
      "path": "guidanceTypes"
    },
    {
      "type": "filter",
      "path": "audience"
    },
    {
      "type": "filter",
      "path": "evidenceTags"
    },
    {
      "type": "filter",
      "path": "symptoms"
    }
  ]
}
```

## Provider options
- `local` (default): Transformers.js `Xenova/multilingual-e5-small`
- `gemini` (optional): kept available behind `EMBEDDING_PROVIDER=gemini`
- `mock` (tests only): deterministic fake vectors
- `none` (dry-run utility): no embeddings generated
