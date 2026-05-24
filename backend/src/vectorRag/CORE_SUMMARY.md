# Vector RAG Core - Implementation Summary

## Exact Files Created

### Core Utilities (5 files)
```
backend/src/vectorRag/core/
├── embeddingClient.js                          (NEW)
├── hashContent.js                              (NEW)
├── chunkText.js                                (NEW)
├── sourceRegistryLoader.js                     (NEW)
└── providers/
    └── geminiEmbeddingProvider.js              (NEW)
```

### MongoDB Models (2 files)
```
backend/src/vectorRag/models/
├── VectorKnowledgeSource.js                    (NEW)
└── VectorKnowledgeChunk.js                     (NEW)
```

### Documentation (2 files)
```
backend/src/vectorRag/
├── CORE_IMPLEMENTATION.md                      (NEW)
└── STRUCTURE_SUMMARY.md                        (existing from previous task)
```

**Total New Files: 9**

---

## What Each File Does

### 1. **embeddingClient.js** (73 lines)
**Central interface for all embedding operations.**
- Backend-only, never exposes API keys
- Wraps GeminiEmbeddingProvider
- Returns structured errors, never throws
- Methods:
  - `async embed(text)` → `{ embedding, error, message, usage }`
  - `async embedBatch(texts)` → array of results
  - `checkReady()` → { ready, message, error }
  - `getStatus()` → sanitized status (no keys)

### 2. **geminiEmbeddingProvider.js** (194 lines)
**Implements Google Gemini embedding API calls.**
- Reads API key from config or env variable
- Handles rate limiting (429): returns `{ error: 'RATE_LIMITED', retryAfter: ms }`
- Handles quota exhaustion (403): sets `quotaExhausted = true`, provider becomes unavailable
- Retries transient failures with exponential backoff
- Methods:
  - `async embedText(text)` → result with embedding or error
  - `async embedBatch(texts)` → sequential (respects rate limits)
  - `checkReady()` → checks quota/rate limit state
  - `getStatus()` → provider status (no API key exposed)

### 3. **hashContent.js** (59 lines)
**Stable SHA256 hashing for duplicate detection.**
- Prevents re-embedding identical content
- Methods:
  - `hashText(text)` → SHA256 hash
  - `hashMetadata(metadata)` → SHA256 hash with sorted keys
  - `generateContentHash(text, metadata)` → `{ textHash, metadataHash, combinedHash }`
  - `isDuplicateHash(hash, db)` → marker function

### 4. **chunkText.js** (193 lines)
**Text chunking with overlap for vector embedding.**
- **Default chunk size:** 800 characters
- **Default overlap:** 200 characters
- **Min chunk size:** 100 characters (discarded unless from KnowledgeCards)
- **Boundary breaking:** Prefers sentence boundaries (., !, ?)
- Methods:
  - `chunkText(text, options)` → generic chunking
  - `chunkKnowledgeCard(card, sourceId)` → structured, allows small chunks
  - `chunkMarkdown(markdownText, sourceId)` → header-aware chunking
  - `chunkPDF(pdfText, metadata, sourceId)` → page-aware chunking

### 5. **sourceRegistryLoader.js** (201 lines)
**Load and validate sourceRegistry.json without crashing.**
- Returns errors array instead of throwing
- Validates required fields and enum values
- Methods:
  - `loadSourceRegistry(path)` → `{ sources, metadata, errors }`
  - `validateSourceEntry(source, index)` → errors array
  - `getSourceById(sources, sourceId)` → source or null
  - `filterByAudience(sources, audience)` → filtered sources
  - `filterByGuidanceType(sources, guidanceType)` → filtered sources
  - `getPatientSafeSources(sources)` → PATIENT + not restricted
  - `sortByPriority(sources)` → sorted by priority (1=highest)

### 6. **VectorKnowledgeSource.js** (MongoDB Model - 150 lines)
**Metadata and ingestion status for source documents.**

**Key Fields:**
- `sourceId` (unique) - Identifier from sourceRegistry.json
- `sourceKind` - KNOWLEDGE_CARD | MARKDOWN | PDF | HTML
- `title`, `path`, `language`, `trusted`, `priority`
- `audiences` - PATIENT, HEALTH_WORKER, ADMIN, DOCS
- `allowedGuidanceTypes` - Types this source provides
- `restrictedPatientContext` - Should NOT appear in patient output
- `ingestionStatus` - PENDING | INGESTED | PARTIAL | ERROR | SKIPPED_NEEDS_OCR
- `lastIngestedAt` - When was it processed?
- `chunkCount` - How many chunks created?
- `errorMessage` - What went wrong (if ERROR)

**Methods:**
- `markIngested(chunkCount)` - Mark successful ingestion
- `markPartialIngestion(chunkCount, error)` - Mark partial success
- `markIngestionError(error)` - Mark failed ingestion
- `getStatus()` - Get readable status

**Indexes:** sourceId, sourceKind, priority, ingestionStatus, audiences, trusted

### 7. **VectorKnowledgeChunk.js** (MongoDB Model - 210 lines)
**Individual chunks with embeddings and metadata.**

**Key Fields:**
- `chunkId` (unique) - sourceId_index format
- `sourceId`, `sourceKind`, `sourceTitle`, `sourcePath`
- `text` - Actual chunk content
- `textHash` (indexed) - SHA256 for duplicate detection
- `embedding` - Vector array (768-1536 dimensions)
- `language`, `symptoms`, `evidenceTags`
- `riskLevelAllowed` - HIGH, MEDIUM, LOW
- `guidanceTypes` - Type of guidance provided
- `audience` - PATIENT, HEALTH_WORKER, ADMIN, DOCS
- `trusted`, `priority`
- `fromKnowledgeCard` - Special flag for JSON card chunks

**Methods:**
- `hasEmbedding()` - Check if vector is present
- `isPatientSafe()` - Check if safe for patient output
- `getDisplayText(maxLength)` - Get text (truncated if needed)
- `findByTextHash(hash)` - Static: find by text hash
- `findBySourceId(sourceId)` - Static: get all chunks from source
- `findPatientSafe()` - Static: get patient-safe chunks
- `findByGuidanceType(type)` - Static: filter by guidance type

**Indexes:** sourceId, sourceKind, textHash, audience, guidanceTypes, riskLevelAllowed, trusted, priority

---

## Gemini Quota Failure Behavior

### Rate Limit (429)
```javascript
{
  error: 'RATE_LIMITED',
  message: 'Rate limited. Retry after 1000ms',
  retryAfter: 1000,  // milliseconds
  embedding: null,
  usage: null
}
```
- Client should wait `retryAfter` milliseconds
- Can continue with other requests
- Temporary condition

### Quota Exhausted (403 with quota message)
```javascript
{
  error: 'QUOTA_EXHAUSTED',
  message: 'Gemini API quota exhausted. Check billing.',
  embedding: null,
  usage: null
}
```
- Provider sets `quotaExhausted = true`
- All subsequent embedding calls will fail immediately (no API call)
- Must upgrade plan or wait for quota reset
- Permanent until quota resets

### API Key Invalid (403 without quota message)
```javascript
{
  error: 'FORBIDDEN',
  message: 'API key invalid or insufficient permissions',
  embedding: null,
  usage: null
}
```
- Check `GEMINI_API_KEY` environment variable
- Verify API is enabled in Google Cloud Console
- Check API key has Generative AI permissions

### Invalid Request (400)
```javascript
{
  error: 'INVALID_REQUEST',
  message: 'Invalid request to API',
  embedding: null,
  usage: null
}
```
- Text might be too large (>100KB safety limit enforced)
- Malformed request

### Network/5xx Errors
```javascript
// Retries automatically with exponential backoff
// After 3 retries:
{
  error: 'PROVIDER_ERROR',
  message: 'Gemini API error after 3 retries: ...',
  embedding: null,
  usage: null
}
```

---

## How Duplicate Embeddings Are Avoided

### Step 1: Generate Hash
```javascript
const hashContent = require('./vectorRag/core/hashContent');

const { textHash, metadataHash, combinedHash } = hashContent.generateContentHash(
  chunkText,
  { sourceId: 'who_danger_signs', sectionTitle: 'Bleeding' }
);
```

### Step 2: Check Database
```javascript
const VectorKnowledgeChunk = require('./vectorRag/models/VectorKnowledgeChunk');

const existing = await VectorKnowledgeChunk.findByTextHash(textHash);
if (existing) {
  console.log('Chunk already embedded, skipping');
  continue;  // Skip embedding
}
```

### Step 3: If New, Embed It
```javascript
const EmbeddingClient = require('./vectorRag/core/embeddingClient');
const client = new EmbeddingClient();

const result = await client.embed(chunkText);
if (!result.error) {
  // Save new chunk with embedding
  const chunk = new VectorKnowledgeChunk({
    chunkId: `${sourceId}_${index}`,
    textHash: textHash,
    embedding: result.embedding,
    text: chunkText,
    // ... other fields
  });
  await chunk.save();
}
```

### Cost Impact
- **Skipped chunks:** 0 API cost (no embedding call)
- **File change detection:** VectorKnowledgeSource tracks fileHash
- **Partial re-ingestion:** If 1 chunk changes in a file, only new/changed chunks are re-embedded

### Example Savings
- Source with 100 chunks, all already embedded: 0 API calls, 0 cost
- Source with 100 chunks, 1 chunk changes: 1 API call (only new chunk)
- Source with 100 chunks, file not changed: 0 API calls (fileHash matches)

---

## What's Protected (Not Modified)

✅ **Live Systems - Untouched:**
- `backend/src/triage/` (rule engine)
- `backend/src/controllers/` (patient triage flow)
- `backend/src/ai/` (extraction, LLM explanation)
- `backend/src/safety/` (safety validator)
- Database (no migrations, new collections only)

✅ **Configuration:**
- `RAG_MODE=json` (JSON RAG still active)
- `RAG_VECTOR_ENABLED=false` (vector RAG disabled)
- No production changes to patient flow

✅ **Existing Functionality:**
- KnowledgeCards.json JSON RAG
- Patient triage output
- Health worker consultation
- All safety checks

---

## Model Relationships

```
VectorKnowledgeSource (1)
        ↓
        ├─ many → VectorKnowledgeChunk
        │         (same sourceId)
        │
        └─ Tracks ingestion status
           - PENDING → chunks not yet created
           - INGESTED → all chunks created & embedded
           - PARTIAL → some chunks created, some failed
           - ERROR → ingestion failed
           - SKIPPED_NEEDS_OCR → PDF needs OCR

VectorKnowledgeChunk
        ├─ Text content to embed
        ├─ Embedding vector (768-1536 dims)
        ├─ Audience restrictions (PATIENT safe?)
        ├─ Guidance type restrictions
        ├─ Risk level restrictions
        └─ Text hash for duplicate detection
```

---

## Environment Variables Required

```bash
# For embedding functionality
EMBEDDING_PROVIDER=gemini              # Required
GEMINI_API_KEY=...                     # Required for production
GEMINI_EMBEDDING_MODEL=embedding-001   # Optional

# For RAG mode (keep JSON RAG active while testing)
RAG_VECTOR_ENABLED=false               # Keep at false for now
RAG_MODE=json                          # Stay on JSON RAG
```

---

## Next Steps (Not In This Task)

1. **Ingestion Service** - Load sources, chunk, embed
2. **Vector Search** - MongoDB Atlas Vector Search integration
3. **Retrieval Pipeline** - Query against vector chunks
4. **Decision Builder Integration** - Use vector RAG for supplementary info
5. **Feature Flag** - Control when vector RAG is active
6. **Testing** - Unit tests for chunking, hashing, embedding
7. **Monitoring** - Track API quota, latency, costs

---

## Status

✅ **Core Infrastructure:** Complete
- Embedding client with error handling
- Gemini provider with quota/rate limit handling
- Chunking utilities for all source types
- Hash-based duplicate detection
- Source registry loader with validation
- MongoDB models with indexes and methods

❌ **Not Yet Implemented:**
- Ingestion orchestration service
- Vector search queries
- Live integration into patient flow
- Feature flags and fallback logic

---

**Created:** 2026-05-23  
**Live Integration:** NOT ENABLED  
**Status:** Ready for Ingestion Service Development
