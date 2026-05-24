# Vector RAG Core Implementation - Complete Summary

## Task Completed ✅

Built reusable Vector RAG core infrastructure with MongoDB models and Gemini embedding provider. **No live systems modified. Vector RAG not yet integrated into patient flow.**

---

## Exact Files Created (9 Total)

### Core Embedding & Utilities (5 files)

| File | Lines | Purpose |
|------|-------|---------|
| [backend/src/vectorRag/core/embeddingClient.js](backend/src/vectorRag/core/embeddingClient.js) | 73 | Central interface for embedding operations, backend-only |
| [backend/src/vectorRag/core/providers/geminiEmbeddingProvider.js](backend/src/vectorRag/core/providers/geminiEmbeddingProvider.js) | 194 | Gemini API calls with quota/rate-limit handling |
| [backend/src/vectorRag/core/hashContent.js](backend/src/vectorRag/core/hashContent.js) | 59 | SHA256 hashing for duplicate detection |
| [backend/src/vectorRag/core/chunkText.js](backend/src/vectorRag/core/chunkText.js) | 193 | Text chunking with overlap (800 char default, 200 overlap) |
| [backend/src/vectorRag/core/sourceRegistryLoader.js](backend/src/vectorRag/core/sourceRegistryLoader.js) | 201 | Load and validate sourceRegistry.json without crashing |

### MongoDB Models (2 files)

| File | Lines | Purpose |
|------|-------|---------|
| [backend/src/vectorRag/models/VectorKnowledgeSource.js](backend/src/vectorRag/models/VectorKnowledgeSource.js) | 150 | Source metadata, ingestion status, chunk tracking |
| [backend/src/vectorRag/models/VectorKnowledgeChunk.js](backend/src/vectorRag/models/VectorKnowledgeChunk.js) | 210 | Embedded chunks with vectors, metadata, audience restrictions |

### Documentation (2 files)

| File | Purpose |
|------|---------|
| [backend/src/vectorRag/CORE_IMPLEMENTATION.md](backend/src/vectorRag/CORE_IMPLEMENTATION.md) | Detailed technical documentation |
| [backend/src/vectorRag/CORE_SUMMARY.md](backend/src/vectorRag/CORE_SUMMARY.md) | Implementation summary with examples |
| [backend/src/vectorRag/QUICK_REFERENCE.md](backend/src/vectorRag/QUICK_REFERENCE.md) | Quick start and API reference |

---

## Architecture Overview

```
EmbeddingClient (Backend Interface)
    ↓
GeminiEmbeddingProvider (API Calls)
    ↓ (on failure/quota)
Return { embedding, error, message }

SourceRegistryLoader (Load sources)
    ↓
ChunkText (Split into pieces)
    ↓
HashContent (Check for duplicates)
    ↓
EmbeddingClient (Create vectors)
    ↓
VectorKnowledgeChunk (Store in DB)

VectorKnowledgeSource (Track source metadata)
    ↓
Mark as INGESTED / PARTIAL / ERROR
```

---

## Model Fields Summary

### VectorKnowledgeSource (Source Metadata)

**Identity & Type:**
- `sourceId` (unique) - Identifier from sourceRegistry.json
- `sourceKind` - KNOWLEDGE_CARD | MARKDOWN | PDF | HTML
- `title`, `path`, `language`, `evidenceTag`

**Configuration:**
- `trusted` - Is this a verified source?
- `priority` - 1 (highest, Knowledge Cards) to 4 (policy/facility)
- `audiences` - PATIENT, HEALTH_WORKER, ADMIN, DOCS
- `allowedGuidanceTypes` - Types this source provides
- `restrictedPatientContext` - NOT for patient output?

**Ingestion Status:**
- `ingestionStatus` - PENDING | INGESTED | PARTIAL | ERROR | SKIPPED_NEEDS_OCR
- `lastIngestedAt` - When processed?
- `chunkCount` - How many chunks created?
- `errorMessage` - What went wrong (if ERROR)?
- `fileHash` - SHA256 of file (change detection)

**Methods:**
- `markIngested(count)` - Mark successful
- `markPartialIngestion(count, error)` - Some chunks failed
- `markIngestionError(error)` - Failed completely
- `getStatus()` - Readable status

### VectorKnowledgeChunk (Embedded Chunks)

**Identity & Source:**
- `chunkId` (unique) - sourceId_index
- `sourceId`, `sourceKind`, `sourceTitle`, `sourcePath`
- `sourceUrl` - Web URL (HTML only)

**Content:**
- `text` - Actual chunk text
- `textHash` (indexed) - SHA256 for duplicate detection
- `embedding` - Vector array (768-1536 dimensions)
- `language` - Language code

**Metadata & Restrictions:**
- `symptoms` - Extracted symptoms
- `evidenceTags` - Evidence categories
- `riskLevelAllowed` - HIGH, MEDIUM, LOW
- `guidanceTypes` - Types of guidance
- `audience` - PATIENT, HEALTH_WORKER, ADMIN, DOCS
- `sourceUse` - Purpose description
- `trusted` - From verified source?
- `priority` - Source priority (inherited)

**Special:**
- `pageStart`, `pageEnd` - PDF page numbers
- `sectionTitle` - Markdown section
- `fromKnowledgeCard` - Is from JSON KnowledgeCards?

**Methods:**
- `hasEmbedding()` - Check if vector present
- `isPatientSafe()` - Safe for patient output?
- `getDisplayText(maxLength)` - Text (truncated)
- Static: `findByTextHash()`, `findBySourceId()`, `findPatientSafe()`, `findByGuidanceType()`

---

## Core Utilities Detailed

### 1. EmbeddingClient - Central Interface

**Never exposes API keys to frontend or logs**

```javascript
const client = new EmbeddingClient();

// Single embedding
const result = await client.embed("warning signs");
// → { embedding: [768 floats], error: null, message, usage }

// Batch (sequential, respects rate limits)
const results = await client.embedBatch([text1, text2]);
// → array of results

// Status check
const status = client.getStatus();
// → { initialized, provider, providerReady, lastError }
```

### 2. GeminiEmbeddingProvider - API Implementation

**Handles quota and rate limits gracefully**

| Error | Return | Action |
|-------|--------|--------|
| Rate Limit (429) | `{ error: 'RATE_LIMITED', retryAfter: ms }` | Wait then retry |
| Quota (403) | `{ error: 'QUOTA_EXHAUSTED' }` | Sets `quotaExhausted=true`, all calls fail |
| Invalid Key (403) | `{ error: 'FORBIDDEN' }` | Check config |
| Invalid Input (400) | `{ error: 'INVALID_REQUEST' }` | Check text |
| Network/5xx | Retries 3x with exponential backoff | Auto-recovery |

**Special:** If quota exhausted, provider blocks all subsequent calls (no API waste)

### 3. HashContent - Duplicate Detection

```javascript
const hashes = hashContent.generateContentHash(text, metadata);
// → { textHash, metadataHash, combinedHash }

// Before embedding: check if hash exists in DB
const existing = await VectorKnowledgeChunk.findByTextHash(hashes.textHash);
if (existing) skip;  // Save API cost
```

### 4. ChunkText - Text Splitting

```javascript
// Default: 800 char chunks, 200 char overlap, min 100 chars
const chunks = chunkText.chunkText(longText);

// Specialized functions:
chunkText.chunkKnowledgeCard(card, sourceId);  // Structured, allows small chunks
chunkText.chunkMarkdown(mdText, sourceId);      // Header-aware splitting
chunkText.chunkPDF(pdfText, metadata, sourceId); // Page-aware splitting
```

### 5. SourceRegistryLoader - Validation

```javascript
const { sources, metadata, errors } = loader.loadSourceRegistry();

// Filter by patient safety
const safe = loader.getPatientSafeSources(sources);

// Sort by priority (1 = highest)
const sorted = loader.sortByPriority(sources);
```

---

## How Duplicate Embeddings Are Avoided

### Complete Flow

```
1. Load source file → generate fileHash (SHA256)
   Check VectorKnowledgeSource.fileHash
   If matches → SKIP (file unchanged)

2. Chunk document → for each chunk:
   a. Generate textHash = SHA256(chunk.text)
   b. Query: VectorKnowledgeChunk.findOne({ textHash })
   c. If exists → SKIP (chunk already embedded)
   d. If new:
      - Call EmbeddingClient.embed(text)
      - Create chunk with vector
      - Save to DB

3. Update source status:
   - If all chunks embedded: INGESTED
   - If some failed: PARTIAL
   - If error: ERROR
```

### Cost Impact

- **Skipped chunks:** $0 (no API call)
- **Skipped files:** $0 (file hash match)
- **Partial re-ingestion:** Only new chunks cost API

### Example

```
Source: WHO danger signs summary
- File not changed: 0 API calls, 0 cost ✓
- 1 chunk changed in 100: 1 API call (~0.0001 cost)
- All 100 chunks new: 100 API calls (~$0.01)
```

---

## Gemini Quota Failure Behavior

### Scenario 1: Rate Limited
```javascript
{
  error: 'RATE_LIMITED',
  message: 'Rate limited. Retry after 1000ms',
  retryAfter: 1000,  // milliseconds to wait
  embedding: null
}
```
- **Action:** Implement exponential backoff
- **Provider state:** `provider.rateLimited = true` (temporary)
- **Recovery:** Automatic on successful call

### Scenario 2: Quota Exhausted
```javascript
{
  error: 'QUOTA_EXHAUSTED',
  message: 'Gemini API quota exhausted. Check billing.',
  embedding: null
}
```
- **Action:** Stop batch ingestion, alert admin
- **Provider state:** `provider.quotaExhausted = true` (permanent)
- **Recovery:** Must upgrade plan or wait for reset
- **Protection:** All subsequent calls fail immediately (no API waste)

### Scenario 3: Invalid API Key
```javascript
{
  error: 'FORBIDDEN',
  message: 'API key invalid or insufficient permissions',
  embedding: null
}
```
- **Action:** Check `GEMINI_API_KEY` environment variable
- **Verify:** API enabled in Google Cloud Console
- **Check:** API key has Generative AI permissions

### Implementation Pattern
```javascript
const result = await client.embed(text);

if (result.error === 'RATE_LIMITED') {
  // Implement backoff
  await delay(result.retryAfter);
  // Retry
} else if (result.error === 'QUOTA_EXHAUSTED') {
  // Stop processing, alert admin
  logger.error('Quota exhausted, stopping batch');
  break;
} else if (result.error === 'FORBIDDEN') {
  // Configuration issue
  logger.error('Check GEMINI_API_KEY configuration');
  return;
}
```

---

## What's Protected (Not Modified)

✅ **Live Patient Flow - Untouched:**
- `backend/src/triage/` - Rule engine
- `backend/src/controllers/` - Patient routes
- `backend/src/ai/` - LLM extraction and explanation
- `backend/src/safety/` - Safety validator

✅ **Configuration:**
- `RAG_MODE=json` (JSON RAG still active)
- `RAG_VECTOR_ENABLED=false` (Vector RAG disabled)
- No production changes

✅ **Database:**
- No migrations on existing collections
- New collections created on first write
- Existing data untouched

---

## MongoDB Indexes

### VectorKnowledgeSource
- `sourceId` (unique)
- `sourceKind`
- `priority`
- `ingestionStatus`
- `audiences`
- `trusted`

### VectorKnowledgeChunk
- `chunkId` (unique)
- `sourceId`
- `sourceKind`
- `textHash` (for duplicate detection)
- `audience` (for patient/worker filtering)
- `guidanceTypes`
- `riskLevelAllowed`
- `trusted`
- `priority`
- `embedding` (vector search index - must be created in MongoDB Atlas)

### Vector Search Index (MongoDB Atlas)
```
Index name: "embedding_vector_index"
Field: "embedding"
Dimensions: 768 (for embedding-001)
```

---

## Environment Variables

```bash
# Required for production
EMBEDDING_PROVIDER=gemini              # Set to 'gemini'
GEMINI_API_KEY=...                     # Your API key (never log this)

# Optional
GEMINI_EMBEDDING_MODEL=embedding-001   # Default: embedding-001
RAG_VECTOR_ENABLED=false               # Keep false until ready
RAG_MODE=json                          # Keep as 'json' (fallback)
```

---

## Next Steps (Not In This Task)

1. **Ingestion Service** - Orchestrate source loading, chunking, embedding
2. **Vector Search** - Query against embedded chunks
3. **Retrieval Pipeline** - Search, rerank, filter by audience
4. **Decision Builder Integration** - Use vector RAG alongside JSON RAG
5. **Feature Flag** - RAG_VECTOR_ENABLED to control adoption
6. **Fallback Logic** - If vector RAG fails, fall back to JSON RAG
7. **Testing** - Unit tests for all utilities
8. **Monitoring** - Track API quota, latency, costs

---

## File Structure

```
backend/src/vectorRag/
├── core/
│   ├── embeddingClient.js              ✓ Created
│   ├── hashContent.js                  ✓ Created
│   ├── chunkText.js                    ✓ Created
│   ├── sourceRegistryLoader.js         ✓ Created
│   └── providers/
│       └── geminiEmbeddingProvider.js  ✓ Created
│
├── models/
│   ├── VectorKnowledgeSource.js        ✓ Created
│   └── VectorKnowledgeChunk.js         ✓ Created
│
├── ingestion/
│   └── sourceRegistry.json             ✓ Created (previous task)
│
├── CORE_IMPLEMENTATION.md              ✓ Created (detailed docs)
├── CORE_SUMMARY.md                     ✓ Created (implementation summary)
├── QUICK_REFERENCE.md                  ✓ Created (quick start)
└── STRUCTURE_SUMMARY.md                ✓ Created (previous task)
```

---

## Status

✅ **Complete:**
- Embedding client with full error handling
- Gemini provider with quota/rate-limit protection
- Text chunking for all source types
- Hash-based duplicate detection
- Source registry loader with validation
- MongoDB models with indexes and helper methods
- Comprehensive documentation

❌ **Not Yet Implemented:**
- Ingestion orchestration service
- Vector search queries
- Live integration into patient flow
- Feature flags and fallback logic

---

## Test Commands

```bash
# Test embedding client
node -e "
const EmbeddingClient = require('./backend/src/vectorRag/core/embeddingClient');
const client = new EmbeddingClient();
console.log(client.getStatus());
"

# Test chunking
node -e "
const chunkText = require('./backend/src/vectorRag/core/chunkText');
const chunks = chunkText.chunkText('Lorem ipsum ' * 100);
console.log('Chunks:', chunks.length);
"

# Test registry
node -e "
const loader = require('./backend/src/vectorRag/core/sourceRegistryLoader');
const { sources, errors } = loader.loadSourceRegistry();
console.log('Sources:', sources.length, 'Errors:', errors.length);
"
```

---

## Summary

**Created:** 9 files (5 utilities + 2 models + 2 docs)  
**Total Lines:** ~1,080 lines of production code  
**Live Integration:** NOT YET ENABLED  
**Patient Flow:** UNCHANGED  
**Database:** NEW collections only  
**Status:** Core infrastructure ready for ingestion service development

---

**Created:** 2026-05-23  
**Ready for:** Ingestion Service Development  
**No breaking changes to live systems**
