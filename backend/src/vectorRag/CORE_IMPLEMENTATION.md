# Vector RAG Core Implementation

## Files Created

### Core Utilities (backend/src/vectorRag/core/)
1. **embeddingClient.js** - Central interface for embedding operations
2. **providers/geminiEmbeddingProvider.js** - Gemini API embedding provider
3. **hashContent.js** - Stable hashing for duplicate detection
4. **chunkText.js** - Text chunking with overlap
5. **sourceRegistryLoader.js** - Load and validate source registry

### MongoDB Models (backend/src/vectorRag/models/)
1. **VectorKnowledgeSource.js** - Source document metadata and ingestion status
2. **VectorKnowledgeChunk.js** - Individual embedded knowledge chunks

---

## Model Fields Reference

### VectorKnowledgeSource Model

| Field | Type | Purpose |
|-------|------|---------|
| `sourceId` | String (unique) | Identifier from sourceRegistry.json |
| `sourceKind` | Enum | KNOWLEDGE_CARD, MARKDOWN, PDF, HTML |
| `title` | String | Human-readable title |
| `path` | String | Relative path to source file |
| `language` | String[] | Languages (e.g., ["en", "bn"]) |
| `trusted` | Boolean | Is this a verified/trusted source? |
| `priority` | Number | 1=highest, 2=high, 3=medium, 4=lower |
| `audiences` | String[] | PATIENT, HEALTH_WORKER, ADMIN, DOCS |
| `allowedGuidanceTypes` | String[] | Types of guidance this source provides |
| `restrictedPatientContext` | Boolean | Should NOT appear in patient output? |
| `defaultMetadata` | Mixed | Additional metadata from registry |
| `ingestionStatus` | Enum | PENDING, INGESTED, PARTIAL, ERROR, SKIPPED_NEEDS_OCR |
| `lastIngestedAt` | Date | When was it last processed? |
| `chunkCount` | Number | How many chunks were created? |
| `errorMessage` | String | If status is ERROR, what went wrong? |
| `evidenceTag` | String | Evidence category (WHO_DANGER_SIGNS, etc.) |
| `fileHash` | String | SHA256 of file content (for change detection) |

### VectorKnowledgeChunk Model

| Field | Type | Purpose |
|-------|------|---------|
| `chunkId` | String (unique) | sourceId_index format |
| `sourceId` | String (indexed) | Reference to source |
| `sourceKind` | Enum | Type of source |
| `sourceTitle` | String | Source human-readable title |
| `sourcePath` | String | Path to source file |
| `sourceUrl` | String | URL (for HTML sources) |
| `pageStart` | Number | Starting page (PDFs) |
| `pageEnd` | Number | Ending page (PDFs) |
| `sectionTitle` | String | Section (for markdown) |
| `text` | String | Actual chunk content |
| `textHash` | String (indexed) | SHA256 of text for duplicate detection |
| `language` | String | Language code (default "en") |
| `embedding` | Number[] | Vector embedding (typically 768-1536 dims) |
| `symptoms` | String[] | Associated symptoms |
| `evidenceTags` | String[] | Evidence categories |
| `riskLevelAllowed` | String[] | HIGH, MEDIUM, LOW |
| `guidanceTypes` | String[] | Types of guidance |
| `audience` | String[] | PATIENT, HEALTH_WORKER, ADMIN, DOCS |
| `sourceUse` | String | How this chunk should be used |
| `trusted` | Boolean | Is this chunk from trusted source? |
| `priority` | Number | Source priority (inherited) |
| `fromKnowledgeCard` | Boolean | Is this from KnowledgeCards.json? |

---

## Core Utilities Reference

### EmbeddingClient (embeddingClient.js)

**Purpose:** Central interface for all embedding operations. Backend-only, never exposes API keys.

**Constructor:**
```javascript
const EmbeddingClient = require('./vectorRag/core/embeddingClient');
const client = new EmbeddingClient({
  provider: 'gemini',  // from EMBEDDING_PROVIDER env
  apiKey: process.env.GEMINI_API_KEY,  // Read from env, never exposed
  model: 'embedding-001',
});
```

**Key Methods:**
- `async embed(text)` - Embed single text, returns `{ embedding, error, message, usage }`
- `async embedBatch(texts)` - Embed multiple texts (sequential, respects rate limits)
- `checkReady()` - Verify client is operational
- `getStatus()` - Get sanitized status (no API keys exposed)
- `hasApiKey()` - Boolean: is API key configured?

**Error Handling:**
- Returns structured errors, never throws
- Handles rate limits, quota exhaustion, invalid requests
- Retries on transient network failures (with exponential backoff)
- Rate limit failures include `retryAfter` milliseconds

**Example:**
```javascript
const result = await client.embed("What are warning signs of pregnancy?");
if (result.error) {
  console.error(`Embedding failed: ${result.message}`);
  if (result.error === 'RATE_LIMITED') {
    console.log(`Wait ${result.retryAfter}ms before retry`);
  }
} else {
  console.log(`Embedding created, ${result.usage.inputTokens} tokens used`);
}
```

### GeminiEmbeddingProvider (providers/geminiEmbeddingProvider.js)

**Purpose:** Implements embedding calls to Google Gemini API.

**Configuration:**
- Reads API key from config or `GEMINI_API_KEY` environment variable
- Model: `GEMINI_EMBEDDING_MODEL` (default: "embedding-001")
- Timeout: 30 seconds (configurable)
- Max retries: 3 (configurable)

**Quota/Rate Limit Behavior:**
1. **Rate Limited (429):** Returns `error: 'RATE_LIMITED'` with `retryAfter` milliseconds. Sets `this.rateLimited = true`. Client should respect retry-after header.
2. **Quota Exhausted (403 with quota message):** Returns `error: 'QUOTA_EXHAUSTED'`. Sets `this.quotaExhausted = true`. Provider becomes unavailable until reset.
3. **Invalid API Key (403):** Returns `error: 'FORBIDDEN'`. Check API key configuration.
4. **Invalid Request (400):** Returns `error: 'INVALID_REQUEST'`. Check text is valid.
5. **Network/5xx Errors:** Retries automatically with exponential backoff.
6. **Unhandled Errors:** Never thrown. Always returns error object.

**Example:**
```javascript
const provider = new GeminiEmbeddingProvider({
  apiKey: process.env.GEMINI_API_KEY,
});

const result = await provider.embedText("Sample text");
if (result.error === 'QUOTA_EXHAUSTED') {
  // Log, alert, pause ingestion
  logger.error('Gemini quota exhausted, stopping batch ingestion');
}
```

### Hash Content (hashContent.js)

**Purpose:** Generate stable SHA256 hashes for duplicate detection and content verification.

**Functions:**
- `hashText(text)` - SHA256 of trimmed text
- `hashMetadata(metadata)` - SHA256 of sorted metadata JSON
- `generateContentHash(text, metadata)` - Combined hash with both text and metadata
- `isDuplicateHash(contentHash, db)` - Check if hash exists in DB (marker function)

**How Duplicate Avoidance Works:**
1. Before embedding, generate `combinedHash = hashText(text) + hashMetadata(metadata)`
2. Query `VectorKnowledgeChunk.findOne({ textHash })`
3. If exists, skip embedding (save API quota)
4. If not, proceed with embedding

**Example:**
```javascript
const hashContent = require('./vectorRag/core/hashContent');

const hashes = hashContent.generateContentHash(chunkText, {
  sourceId: 'who_danger_signs',
  sectionTitle: 'Vaginal Bleeding',
});

// Check if already embedded
const existing = await VectorKnowledgeChunk.findByTextHash(hashes.textHash);
if (existing) {
  console.log('Chunk already embedded, skipping');
} else {
  // Proceed with embedding
}
```

### Chunk Text (chunkText.js)

**Purpose:** Split source documents into chunks suitable for embedding.

**Chunking Strategy:**
- **Chunk Size:** ~800 characters (configurable)
- **Overlap:** ~200 characters (configurable)
- **Min Chunk:** 100 characters (discarded if smaller, unless from KnowledgeCards)
- **Boundary Break:** Tries to break at sentence boundaries (., !, ?)

**Functions:**
- `chunkText(text, options)` - Generic text chunking
- `chunkKnowledgeCard(card, sourceId)` - Structured chunking for JSON cards
- `chunkMarkdown(markdownText, sourceId)` - Header-aware chunking
- `chunkPDF(pdfText, metadata, sourceId)` - Page-aware chunking

**Special Handling:**
- Knowledge cards: Allow small chunks (<100 chars) because they're structured
- Markdown: Split by headers first, then chunk large sections
- PDFs: Track page numbers through chunking

**Example:**
```javascript
const chunkText = require('./vectorRag/core/chunkText');

// Generic text
const chunks = chunkText.chunkText(longText, {
  chunkSize: 800,
  overlap: 200,
  minChunkSize: 100,
});

// Knowledge card (special handling for small chunks)
const cardChunks = chunkText.chunkKnowledgeCard(card, 'knowledge_cards_json');

// Markdown with headers
const mdChunks = chunkText.chunkMarkdown(mdContent, 'who_danger_signs_summary');
```

### Source Registry Loader (sourceRegistryLoader.js)

**Purpose:** Load and validate sourceRegistry.json without crashing.

**Functions:**
- `loadSourceRegistry(path)` - Load registry file, returns `{ sources, metadata, errors }`
- `validateSourceEntry(source, index)` - Validate single entry, returns errors array
- `getSourceById(sources, sourceId)` - Find source by ID
- `filterByAudience(sources, audience)` - Filter by PATIENT/HEALTH_WORKER/ADMIN/DOCS
- `filterByGuidanceType(sources, guidanceType)` - Filter by guidance type
- `getPatientSafeSources(sources)` - Get patient-safe sources (PATIENT audience + not restricted)
- `sortByPriority(sources)` - Sort by priority (1=highest)

**Error Handling:**
- Returns errors array, doesn't throw
- Validates all required fields (sourceId, sourceKind, path, title)
- Validates enum values (sourceKind, audiences, guidanceTypes)
- If file doesn't exist, returns empty sources with clear error

**Example:**
```javascript
const loader = require('./vectorRag/core/sourceRegistryLoader');

const { sources, metadata, errors } = loader.loadSourceRegistry();

if (errors.length > 0) {
  console.warn('Registry load warnings:', errors);
}

// Get patient-safe sources
const patientSources = loader.getPatientSafeSources(sources);

// Get high-priority sources
const sorted = loader.sortByPriority(sources);
const topSources = sorted.slice(0, 5);
```

---

## Architecture & Integration Notes

### Current Status
- ✅ Core utilities implemented
- ✅ MongoDB models defined
- ✅ Error handling in place
- ❌ NOT YET integrated into patient flow
- ❌ NO live system modifications

### Environment Variables Required

```bash
# Embedding configuration
EMBEDDING_PROVIDER=gemini              # Required: 'gemini'
GEMINI_EMBEDDING_MODEL=embedding-001   # Optional, default: embedding-001
GEMINI_API_KEY=...                     # Required for production

# RAG mode (keep JSON RAG active while testing vector RAG)
RAG_VECTOR_ENABLED=false               # Don't use vector RAG in live flow yet
RAG_MODE=json                          # Stay on JSON RAG fallback
```

### What's Protected

✅ **Not Modified:**
- Rule engine
- Decision builder
- AI extraction
- LLM explanation
- Safety validator
- Patient result flow
- Worker flow

✅ **No Database Migrations:**
- New collections created on first write
- Existing data untouched

✅ **No Package Installations:**
- Uses existing dependencies (mongoose, axios, crypto)

---

## How Duplicate Embeddings Are Avoided

### Process Flow

```
1. Load source document (JSON, MD, PDF, HTML)
   ↓
2. Chunk document into semantic pieces
   ↓
3. For each chunk:
   a. Generate textHash = SHA256(chunk.text)
   b. Query DB: VectorKnowledgeChunk.findOne({ textHash })
   c. If exists:
      - Log "Chunk already embedded"
      - Skip to next chunk
   d. If not exists:
      - Call EmbeddingClient.embed(text)
      - Create VectorKnowledgeChunk with embedding
      - Save to DB
   ↓
4. Update VectorKnowledgeSource status
```

### Database Queries for Duplicate Detection

```javascript
// Check if text hash exists
const existing = await VectorKnowledgeChunk.findByTextHash(textHash);
if (existing) {
  // Chunk already embedded, skip
  chunkCounter.skipped++;
  continue;
}

// Check entire source already embedded
const source = await VectorKnowledgeSource.findOne({ sourceId });
if (source.ingestionStatus === 'INGESTED') {
  // All chunks already embedded
  // Can skip unless file hash has changed
  if (source.fileHash === currentFileHash) {
    return; // Nothing changed
  }
}
```

### Cost Savings

- Skipped chunks: 0 API cost
- Partial re-ingestion: Only new/changed chunks embedded
- File hash tracking: Detects if source changed before re-processing

---

## Testing the Core (No Live Integration)

### Test Embedding Client
```javascript
const EmbeddingClient = require('./backend/src/vectorRag/core/embeddingClient');

async function testEmbedding() {
  const client = new EmbeddingClient();
  
  const status = client.getStatus();
  console.log('Client ready:', status.providerReady);
  
  if (status.providerReady) {
    const result = await client.embed("Test warning signs");
    console.log('Embedding created:', result.embedding?.length, 'dimensions');
  }
}

testEmbedding().catch(console.error);
```

### Test Source Registry
```javascript
const loader = require('./backend/src/vectorRag/core/sourceRegistryLoader');

const { sources, errors } = loader.loadSourceRegistry();
console.log(`Loaded ${sources.length} sources`);
if (errors.length > 0) {
  console.warn('Errors:', errors);
}

const patientSources = loader.getPatientSafeSources(sources);
console.log(`${patientSources.length} sources safe for patients`);
```

### Test Chunking
```javascript
const chunkText = require('./backend/src/vectorRag/core/chunkText');

const chunks = chunkText.chunkText("Long text here...", {
  chunkSize: 800,
  overlap: 200,
});
console.log(`Created ${chunks.length} chunks`);
```

---

## Next Steps (Future Work - Not In Scope)

1. **Ingestion Service** - Orchestrate source loading, chunking, embedding
2. **Vector Search Integration** - MongoDB Atlas Vector Search queries
3. **Retrieval Pipeline** - Query expansion, reranking, safety filtering
4. **Decision Builder Integration** - Add vector RAG as supplementary source (alongside JSON RAG)
5. **Feature Flag** - Control when vector RAG is used (RAG_VECTOR_ENABLED)
6. **Fallback Logic** - If vector RAG fails, fall back to JSON RAG
7. **Batch Processing** - Background ingestion jobs for large documents
8. **Monitoring** - Track embedding costs, API quota usage, vector search latency

---

**Status:** Core Implementation Complete | Ready for Ingestion Service Development  
**Live Integration:** NOT YET ENABLED  
**Created:** 2026-05-23
