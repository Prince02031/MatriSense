# Vector RAG Ingestion System

## Overview

Ingestion system for converting multiple source types (JSON, Markdown, PDF, HTML) into embedded knowledge chunks for Vector RAG. Orchestrates source loading, chunking, embedding, and database storage without modifying live patient flow.

---

## Architecture

```
SourceRegistry (sourceRegistry.json)
    ↓
[Adapters] → Normalized Records
    ├─ KnowledgeCardAdapter (JSON → records)
    ├─ MarkdownAdapter (MD → records)
    ├─ PDFAdapter (PDF → records)
    └─ HTMLAdapter (HTML → records)
    ↓
ChunkText (split into smaller pieces)
    ↓
EmbeddingClient (create vectors)
    ↓ (check cache)
    ↓ (check database)
    ↓ (embed if new)
    ↓
VectorKnowledgeChunk (save to DB)
    ↓
VectorKnowledgeSource (update status)
    ↓
Summary Report
```

---

## Files Created

### Adapters (backend/src/vectorRag/adapters/)
1. **knowledgeCardAdapter.js** - Convert KnowledgeCards.json to records
2. **markdownAdapter.js** - Parse markdown summaries by heading
3. **pdfAdapter.js** - Extract text from PDFs (no OCR)
4. **htmlAdapter.js** - Strip HTML and extract visible text

### Ingestion (backend/src/vectorRag/ingestion/)
1. **ingestAllSources.js** - Main orchestrator service
2. **embeddingCache.js** - In-memory cache + DB duplicate detection
3. **scripts/runIngestion.js** - CLI entry point

### Configuration
- Updated **backend/package.json** with npm scripts

---

## Normalized Record Format

All adapters return normalized records:

```javascript
{
  sourceId,           // From sourceRegistry.json
  sourceKind,         // KNOWLEDGE_CARD | MARKDOWN | PDF | HTML
  sourceTitle,        // Human-readable title
  sourcePath,         // Path to source file
  pageStart,          // Page number (PDFs only)
  pageEnd,            // Page number (PDFs only)
  sectionTitle,       // Section heading (Markdown/HTML)
  text,               // Actual content to embed
  metadata: {
    // Source-specific metadata preserved
    symptoms,         // From KnowledgeCards
    riskLevelAllowed, // From KnowledgeCards
    guidanceType,     // From KnowledgeCards
    evidenceTags,     // From KnowledgeCards
    language,         // From registry
    trusted,          // From registry
    audiences,        // From registry
    allowedGuidanceTypes, // From registry
    priority,         // From registry
  }
}
```

---

## Adapter Details

### KnowledgeCardAdapter

**Input:** `backend/src/rag/knowledgeCards.json`

**Preserves:**
- `card.id` → chunkId seed
- `card.symptoms` → metadata.symptoms
- `card.riskLevelAllowed` → metadata.riskLevelAllowed
- `card.guidanceType` → metadata.guidanceType
- `card.evidenceTag` → metadata.evidenceTags
- `card.stepsBn`, `card.monitorBn`, `card.escalationTriggersBn` → combined text
- `card.doNotSay` → combined text
- `card.sourceName` → included in text

**Example:**
```javascript
{
  condition: "vaginal_bleeding",
  stepsBn: ["দেরি না করে স্বাস্থ্যকর্মী...", "..."],
  symptoms: ["vaginal_bleeding"],
  guidanceType: "URGENT_ESCALATION",
  evidenceTag: "WHO_PREGNANCY_DANGER_SIGNS"
}
// Becomes:
{
  text: "Condition: vaginal_bleeding | Guidance Type: URGENT_ESCALATION | Steps (Bengali): ... | ...",
  metadata: {
    cardId: "who_bleeding_urgent",
    symptoms: ["vaginal_bleeding"],
    riskLevelAllowed: ["HIGH"],
    guidanceType: "URGENT_ESCALATION",
    evidenceTags: ["WHO_PREGNANCY_DANGER_SIGNS"]
  }
}
```

### MarkdownAdapter

**Input:** Files in `backend/data/rag/source-documents/md-files/`

**Strategy:**
- Split by markdown headings (# ## ###)
- Each section becomes a separate record
- Preserves heading as `sectionTitle`
- If no headings, entire file = one record
- Minimum 50 chars per section (skips tiny sections)

**Example:**
```markdown
# WHO Danger Signs
## Vaginal Bleeding
Content about bleeding...
## Severe Headache
Content about headache...
```
→ 2 records (one per section)

### PDFAdapter

**Input:** Files in `backend/data/rag/source-documents/*.pdf`

**Behavior:**
- Uses `pdf-parse` library if available
- Extracts text only (no OCR)
- Tracks page numbers (pageStart, pageEnd)
- Chunks text with page awareness
- Minimum 100 chars per chunk

**Error Handling:**
- **Missing file** → Mark source ERROR
- **No extractable text** → Mark source SKIPPED_NEEDS_OCR
- **Extraction error** → Mark source PARTIAL
- **Never crashes** entire ingestion run

**Example:**
```
PDF with 50 pages
→ Extract text from all pages
→ Create ~50 chunks (1000 chars each)
→ Track pageStart/pageEnd for each chunk
→ If 1 page has scanned image, skip that page content
```

### HTMLAdapter

**Input:** Files like `backend/data/rag/source-documents/cdc-hear-her-warning-signs.html`

**Strategy:**
- Remove script, style, nav, header, footer tags
- Strip HTML tags, decode entities
- Split by h1-h6 headings
- Each section becomes a record
- Minimum 50 chars per section

**Example:**
```html
<nav>...</nav>
<h1>Warning Signs</h1>
<p>Vaginal bleeding is urgent...</p>
<h2>When to Seek Care</h2>
<p>Call immediately if...</p>
```
→ 2 records (Warning Signs + When to Seek Care)

---

## Ingestion Service

### IngestionService Class

```javascript
const IngestionService = require('./ingestAllSources');

const service = new IngestionService({
  dryRun: false,                        // Preview without DB writes
  maxChunks: 10000,                     // Stop after N chunks
  delayBetweenEmbeddings: 0,            // Delay in ms between API calls
  embeddingClient: embeddingClient,     // EmbeddingClient instance
  VectorKnowledgeSource: sourceModel,   // Mongoose model
  VectorKnowledgeChunk: chunkModel,     // Mongoose model
});

const summary = await service.ingestAll();
```

### Ingestion Flow

```
For each source in registry:
  1. Load source file
  2. Check if file exists
  3. Adapt to normalized records
  4. Chunk records (800 chars, 200 overlap)
  5. For each chunk:
     a. Generate textHash
     b. Check memory cache (hit = skip)
     c. Check database (exists = skip)
     d. If quota exhausted: mark PARTIAL, stop source
     e. If max chunks reached: mark PARTIAL, stop source
     f. Call EmbeddingClient (with delay if configured)
     g. Handle rate limit/quota errors
     h. Save chunk to DB with embedding
     i. Add to memory cache
  6. Update source status:
     - INGESTED: all chunks created
     - PARTIAL: some chunks created, some failed/skipped
     - ERROR: ingestion failed
  7. Continue to next source
```

### Embedding Cache

**In-Memory Cache:**
- Stores textHash → embedding mappings
- Checked first (fastest)
- Prevents duplicate API calls during single run
- Tracks hit rate and cost savings

**Database Duplicate Detection:**
- Checks VectorKnowledgeChunk collection
- Uses textHash index (fast lookup)
- Skips already-embedded content
- Updates existing chunks if needed

**Cost Example:**
```
- 1000 chunks total
- 800 already in DB (skipped via hash lookup)
- 150 in memory cache (same run, skipped)
- 50 new chunks embedded
- API cost: 50 * $0.00001 = $0.0005 (instead of $0.01)
```

---

## Quota & Rate Limit Handling

### Rate Limit (429)

**Behavior:**
```javascript
// Provider returns:
{
  error: 'RATE_LIMITED',
  retryAfter: 1000  // milliseconds
}

// Ingestion service:
1. Waits retryAfter milliseconds
2. Retries the chunk once
3. If retry fails: marks chunk failed, continues
4. If retry succeeds: saves chunk, continues
```

### Quota Exhausted (403)

**Behavior:**
```javascript
// Provider returns:
{
  error: 'QUOTA_EXHAUSTED',
  message: 'Gemini API quota exhausted'
}

// Ingestion service:
1. Sets quotaExhausted = true
2. Stops current source (marks PARTIAL)
3. Skips remaining sources
4. Saves already-embedded chunks to DB
5. Reports PARTIAL status
```

**Recovery:**
- Upgrade Gemini API plan or wait for monthly reset
- Re-run ingestion (will skip already-embedded chunks, continue with new ones)

---

## Handling Missing/Problematic Sources

### Missing Files
```
Source path: backend/data/rag/source-documents/missing.pdf
Status: ERROR
Message: File not found

Action:
- Logged as missingFiles in summary
- Source marked ERROR
- Ingestion continues with next source
- Never crashes entire run
```

### PDFs Needing OCR
```
Source: NCBI_bookshelf_high_risk.pdf (scanned image)
Extraction result: No text found
Status: SKIPPED_NEEDS_OCR

Action:
- Logged as ocrSkipped in summary
- Source marked SKIPPED_NEEDS_OCR
- Future: Can re-process when OCR available
- Ingestion continues
```

### Extraction Errors
```
Source: corrupted.pdf (file corrupted)
Error: Failed to parse PDF structure
Status: PARTIAL (if some chunks extracted)
         ERROR (if no chunks extracted)

Action:
- Logged with error details
- Already-extracted chunks saved
- Ingestion continues
```

---

## Running Ingestion

### Full Ingestion
```bash
npm run rag:ingest
```

Behavior:
- Reads all sources from sourceRegistry.json
- Creates embeddings using Gemini API
- Saves chunks to MongoDB
- Updates source status
- Prints summary

### Dry Run (Preview)
```bash
npm run rag:ingest:dry
# or
npm run rag:ingest -- --dry-run
```

Behavior:
- Same as full ingestion
- NO database writes
- NO embedding API calls
- Previews what would be ingested
- Shows statistics

### Advanced Options

```bash
# Limit total chunks
node src/vectorRag/ingestion/scripts/runIngestion.js --max-chunks=1000

# Add delay between embedding calls (quota safety)
node src/vectorRag/ingestion/scripts/runIngestion.js --delay=500

# Verbose logging
node src/vectorRag/ingestion/scripts/runIngestion.js --verbose

# Dry run with max chunks
RAG_INGEST_DRY_RUN=true RAG_INGEST_MAX_CHUNKS=500 npm run rag:ingest
```

### Environment Variables

```bash
# Required
MONGODB_URI=mongodb://...
GEMINI_API_KEY=...

# Optional
EMBEDDING_PROVIDER=gemini                 # Always 'gemini'
GEMINI_EMBEDDING_MODEL=embedding-001      # Model name
RAG_INGEST_MAX_CHUNKS=10000               # Stop after N chunks
RAG_INGEST_DELAY_MS=0                     # Delay between API calls (ms)
RAG_INGEST_DRY_RUN=false                  # Preview without writes
```

---

## Output Summary

After ingestion completes:

```
========== INGESTION SUMMARY ==========
Status: SUCCESS
Total Sources: 20

Chunks:
  Created: 1,234
  Updated: 89
  Skipped: 456

Embeddings:
  Created: 1,234
  Failed: 2

Sources:
  Ingested: 18
  Partial: 1
  Error: 1

Cache Stats:
  Hits: 456
  Misses: 1,234
  Saved API calls: 456
  Hit Rate: 0.27

Missing Files: 1
  - backend/data/rag/source-documents/missing.pdf

Errors: 2
  - [source_id_1] File not found
  - [source_id_2] Extraction error

========================================

Completed in 5.23 minutes (313500ms)
Exit Code: 0
```

---

## Partial Ingestion Recovery

If ingestion is interrupted or quota is exhausted:

### Scenario 1: Quota Exhausted at 50% through

```
Status: PARTIAL
Chunks Created: 500
Chunks Failed: 0
Chunks Skipped: 100

Action:
1. Already-embedded chunks are saved to DB
2. Source status updated (INGESTED or PARTIAL)
3. Remaining sources marked SKIPPED
4. Upgrade API quota or wait for reset
5. Re-run: npm run rag:ingest
6. Ingestion resumes:
   - Skip already-embedded chunks (via hash lookup)
   - Continue with unprocessed sources
```

### Scenario 2: MongoDB Connection Lost

```
Error logged
Ingestion stops
No incomplete chunks saved

Action:
1. Check MongoDB connection
2. Re-run: npm run rag:ingest
3. Ingestion restarts:
   - Skip already-embedded chunks
   - Continue processing
```

### Scenario 3: Large Source Fails (e.g., PDF extraction error)

```
[large_pdf_source] 500 chunks created, 50 chunks failed
Status: PARTIAL
Error: Failed to extract PDF pages 100-150

Action:
1. Already-extracted chunks (1-500) saved
2. Source marked PARTIAL (500/550 chunks)
3. Ingestion continues to next source
4. Can fix PDF and re-run
```

---

## Cost Optimization

### Duplicate Detection
- Text hash lookup prevents re-embedding
- Database check prevents duplicate vectors
- Memory cache speeds up single-run deduplication

### Rate Limit Respect
- Configurable delay between calls
- Automatic exponential backoff
- Quota exhaustion detection

### Batch Resumption
- File hashing tracks processed sources
- Already-embedded chunks skipped
- Partial ingestion preserves progress

**Example Cost Savings:**
```
Scenario: Re-ingest all 20 sources (5000 chunks)

First run: 5000 embeddings = $0.05
Dry run 2 weeks later (checking again):
  - 4500 chunks already embedded (skipped)
  - 500 new chunks added
  - 500 embeddings = $0.005

Total: $0.055 (vs $0.10 if no deduplication)
Savings: 45%
```

---

## Monitoring & Debugging

### Enable Verbose Logging
```bash
node src/vectorRag/ingestion/scripts/runIngestion.js --verbose
```

### Check Source Status
```javascript
const source = await VectorKnowledgeSource.findOne({ sourceId });
console.log(source.getStatus());
// Output: { sourceId, status, chunkCount, lastIngested, error }
```

### Check Chunk Count
```javascript
const count = await VectorKnowledgeChunk.countDocuments({ sourceId });
console.log(`${count} chunks for source`);
```

### Review Errors
```javascript
const sources = await VectorKnowledgeSource.find({ ingestionStatus: 'ERROR' });
console.log(sources.map(s => s.getStatus()));
```

---

## Limitations & Future Work

### Current
- ✅ Text extraction from PDFs
- ✅ HTML text extraction
- ✅ Markdown section parsing
- ✅ KnowledgeCard preservation
- ✅ Duplicate detection
- ✅ Quota/rate limit handling
- ✅ Partial ingestion recovery

### Not Yet
- ❌ OCR for scanned PDFs
- ❌ Image extraction
- ❌ Batch embeddings API (sequential only)
- ❌ Parallel source processing
- ❌ Incremental indexing (re-index on source change)

---

**Status:** Ingestion System Complete | Ready for Production Use  
**Live Integration:** NOT YET ENABLED (RAG_VECTOR_ENABLED=false)  
**Created:** 2026-05-24
