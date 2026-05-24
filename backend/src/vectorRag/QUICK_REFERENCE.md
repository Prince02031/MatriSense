# Vector RAG Core - Quick Reference

## File Locations

```
backend/src/vectorRag/
├── core/
│   ├── embeddingClient.js              # Main interface for embeddings
│   ├── hashContent.js                  # Duplicate detection hashing
│   ├── chunkText.js                    # Text chunking utilities
│   ├── sourceRegistryLoader.js         # Load sourceRegistry.json
│   └── providers/
│       └── geminiEmbeddingProvider.js  # Gemini API implementation
├── models/
│   ├── VectorKnowledgeSource.js        # Source document metadata
│   └── VectorKnowledgeChunk.js         # Embedded chunks storage
├── ingestion/
│   └── sourceRegistry.json             # Source definitions
├── CORE_IMPLEMENTATION.md              # Detailed documentation
├── CORE_SUMMARY.md                     # This file's companion
└── STRUCTURE_SUMMARY.md                # RAG folder structure
```

## Quick Start

### 1. Initialize Embedding Client
```javascript
const EmbeddingClient = require('./backend/src/vectorRag/core/embeddingClient');
const client = new EmbeddingClient();

const status = client.getStatus();
if (!status.providerReady) {
  console.error('Embedding provider not ready:', status);
  return;
}
```

### 2. Load Source Registry
```javascript
const loader = require('./backend/src/vectorRag/core/sourceRegistryLoader');
const { sources, errors } = loader.loadSourceRegistry();

if (errors.length > 0) {
  console.warn('Registry warnings:', errors);
}

const patientSources = loader.getPatientSafeSources(sources);
console.log(`${patientSources.length} sources safe for patients`);
```

### 3. Chunk Text
```javascript
const chunkText = require('./backend/src/vectorRag/core/chunkText');

const chunks = chunkText.chunkText(longText, {
  chunkSize: 800,
  overlap: 200,
  minChunkSize: 100,
});

console.log(`Created ${chunks.length} chunks from ${longText.length} characters`);
```

### 4. Check for Duplicates
```javascript
const hashContent = require('./backend/src/vectorRag/core/hashContent');
const VectorKnowledgeChunk = require('./backend/src/vectorRag/models/VectorKnowledgeChunk');

for (const chunk of chunks) {
  const { textHash } = hashContent.generateContentHash(chunk.text, { sourceId });
  
  const existing = await VectorKnowledgeChunk.findByTextHash(textHash);
  if (existing) {
    console.log('Chunk already embedded, skipping');
    continue;
  }
  
  // Proceed with embedding
  const result = await client.embed(chunk.text);
  // ... save result
}
```

### 5. Save to MongoDB
```javascript
const VectorKnowledgeChunk = require('./backend/src/vectorRag/models/VectorKnowledgeChunk');
const VectorKnowledgeSource = require('./backend/src/vectorRag/models/VectorKnowledgeSource');

// Save source metadata
const source = new VectorKnowledgeSource({
  sourceId: 'who_danger_signs',
  sourceKind: 'MARKDOWN',
  title: 'WHO Danger Signs',
  path: 'backend/data/rag/source-documents/md-files/01_summary.md',
  priority: 2,
  audiences: ['PATIENT', 'HEALTH_WORKER'],
});
await source.save();

// Save chunks
const chunk = new VectorKnowledgeChunk({
  chunkId: 'who_danger_signs_1',
  sourceId: 'who_danger_signs',
  text: 'Warning signs of pregnancy...',
  textHash: hashText,
  embedding: embeddingVector,
  audience: ['PATIENT'],
});
await chunk.save();

// Mark source as ingested
await source.markIngested(chunksCreated);
```

---

## API Reference

### EmbeddingClient

```javascript
// Initialize
const client = new EmbeddingClient({
  provider: 'gemini',
  apiKey: process.env.GEMINI_API_KEY,
  model: 'embedding-001',
});

// Embed single text
const result = await client.embed("Text to embed");
// Returns: { embedding: [768 floats], error: null, message, usage }

// Embed batch (sequential)
const results = await client.embedBatch(["Text 1", "Text 2"]);
// Returns: array of results

// Check status
const status = client.getStatus();
// Returns: { initialized, provider, providerReady, providerStatus, lastError }
```

### GeminiEmbeddingProvider

```javascript
const GeminiEmbeddingProvider = require('./backend/src/vectorRag/core/providers/geminiEmbeddingProvider');
const provider = new GeminiEmbeddingProvider();

// Embed text
const result = await provider.embedText(text);

// Check if ready
const ready = provider.checkReady();
// Returns: { ready: boolean, message, error: null|'QUOTA_EXHAUSTED'|'RATE_LIMITED' }

// Get status
const status = provider.getStatus();
// Returns: { provider, model, ready, quotaExhausted, rateLimited, apiKeyConfigured }
```

### Hash Content

```javascript
const hashContent = require('./backend/src/vectorRag/core/hashContent');

// Hash text
const textHash = hashContent.hashText(text);
// Returns: SHA256 hex string

// Hash metadata
const metaHash = hashContent.hashMetadata({ sourceId, page: 1 });
// Returns: SHA256 hex string (sorted keys)

// Generate combined hash
const hashes = hashContent.generateContentHash(text, metadata);
// Returns: { textHash, metadataHash, combinedHash }
```

### Chunk Text

```javascript
const chunkText = require('./backend/src/vectorRag/core/chunkText');

// Generic text
const chunks = chunkText.chunkText(text, { chunkSize: 800, overlap: 200 });

// Knowledge card (structured)
const cardChunks = chunkText.chunkKnowledgeCard(card, sourceId);

// Markdown (header-aware)
const mdChunks = chunkText.chunkMarkdown(text, sourceId);

// PDF (page-aware)
const pdfChunks = chunkText.chunkPDF(text, { pageStart: 1, pageEnd: 10 }, sourceId);
```

### Source Registry Loader

```javascript
const loader = require('./backend/src/vectorRag/core/sourceRegistryLoader');

// Load registry
const { sources, metadata, errors } = loader.loadSourceRegistry();

// Get source by ID
const source = loader.getSourceById(sources, 'who_danger_signs');

// Filter by audience
const patientSources = loader.filterByAudience(sources, 'PATIENT');

// Filter by guidance type
const warningSignSources = loader.filterByGuidanceType(sources, 'WARNING_SIGNS');

// Get patient-safe sources
const safe = loader.getPatientSafeSources(sources);

// Sort by priority
const sorted = loader.sortByPriority(sources);
```

### VectorKnowledgeSource Model

```javascript
const VectorKnowledgeSource = require('./backend/src/vectorRag/models/VectorKnowledgeSource');

// Create new source
const source = new VectorKnowledgeSource({
  sourceId: 'unique_id',
  sourceKind: 'MARKDOWN',
  title: 'Source Title',
  path: 'relative/path/to/file.md',
  priority: 2,
  audiences: ['PATIENT', 'HEALTH_WORKER'],
});
await source.save();

// Mark as ingested
await source.markIngested(100); // 100 chunks created

// Mark as partial
await source.markPartialIngestion(75, new Error('Some chunks failed'));

// Mark as error
await source.markIngestionError(error);

// Get status
const status = source.getStatus();
// Returns: { sourceId, status, chunkCount, lastIngested, error }
```

### VectorKnowledgeChunk Model

```javascript
const VectorKnowledgeChunk = require('./backend/src/vectorRag/models/VectorKnowledgeChunk');

// Create new chunk
const chunk = new VectorKnowledgeChunk({
  chunkId: 'source_1',
  sourceId: 'who_danger_signs',
  sourceKind: 'MARKDOWN',
  text: 'Chunk text...',
  textHash: 'sha256hash',
  embedding: [0.123, 0.456, ...], // 768-1536 floats
  audience: ['PATIENT'],
  guidanceTypes: ['WARNING_SIGNS'],
});
await chunk.save();

// Find by text hash
const existing = await VectorKnowledgeChunk.findByTextHash(hash);

// Find by source
const chunks = await VectorKnowledgeChunk.findBySourceId(sourceId);

// Find patient-safe
const safe = await VectorKnowledgeChunk.findPatientSafe();

// Find by guidance type
const warningChunks = await VectorKnowledgeChunk.findByGuidanceType('WARNING_SIGNS');

// Check if patient safe
const isSafe = chunk.isPatientSafe();
```

---

## Error Handling Patterns

### Handle Embedding Errors
```javascript
const result = await client.embed(text);

if (result.error) {
  switch (result.error) {
    case 'RATE_LIMITED':
      console.log(`Wait ${result.retryAfter}ms before retry`);
      // Implement exponential backoff
      break;
    case 'QUOTA_EXHAUSTED':
      console.error('API quota exhausted, stopping ingestion');
      // Stop batch processing, alert admin
      break;
    case 'FORBIDDEN':
      console.error('Invalid API key');
      // Check configuration
      break;
    default:
      console.error(`Embedding failed: ${result.message}`);
  }
  return;
}

// Success
console.log('Embedding created:', result.embedding.length, 'dimensions');
```

### Handle Registry Load Errors
```javascript
const { sources, errors } = loader.loadSourceRegistry();

if (errors.length > 0) {
  for (const error of errors) {
    console.warn(error);
  }
  // Continue with loaded sources (some may be invalid)
}

if (sources.length === 0) {
  console.error('No valid sources loaded');
  return;
}
```

### Handle Duplicate Detection
```javascript
for (const chunk of chunks) {
  const hashes = hashContent.generateContentHash(chunk.text, metadata);
  
  try {
    const existing = await VectorKnowledgeChunk.findByTextHash(hashes.textHash);
    if (existing) {
      chunkStats.duplicates++;
      continue;
    }
    
    const result = await client.embed(chunk.text);
    if (result.error) {
      chunkStats.failed++;
      continue;
    }
    
    chunkStats.embedded++;
  } catch (err) {
    console.error('Unexpected error:', err);
    chunkStats.error++;
  }
}
```

---

## Configuration

### Environment Variables
```bash
# Required
EMBEDDING_PROVIDER=gemini
GEMINI_API_KEY=your-key-here

# Optional
GEMINI_EMBEDDING_MODEL=embedding-001
RAG_VECTOR_ENABLED=false
RAG_MODE=json
```

### MongoDB Connection
Models assume Mongoose is already connected:
```javascript
const mongoose = require('mongoose');
await mongoose.connect(process.env.MONGODB_URI);

// Models auto-register with Mongoose
const VectorKnowledgeSource = require('./models/VectorKnowledgeSource');
const VectorKnowledgeChunk = require('./models/VectorKnowledgeChunk');
```

---

## Performance Tips

### Chunking
- Use ~800 char chunks for balance between detail and retrieval speed
- Use ~200 char overlap to maintain context across chunk boundaries
- Discard tiny chunks (<100 chars) unless from KnowledgeCards

### Embedding
- Use batch embedding for multiple texts (handles rate limits)
- Check for duplicates before embedding (hash lookup is cheap)
- Track file hashes to avoid re-processing unchanged files

### Database
- Indexes on sourceId, sourceKind, textHash, audience, priority
- Vector index on `embedding` field (MongoDB Atlas Vector Search)
- Consider pagination for large source retrievals

### Cost Optimization
- Hash-based deduplication: Skip ~80% of re-ingestions
- File hash tracking: Skip entirely unchanged sources
- Batch rate-limit awareness: Respect retry-after headers

---

## Testing

### Test Embedding
```bash
node -e "
const EmbeddingClient = require('./backend/src/vectorRag/core/embeddingClient');
const client = new EmbeddingClient();
client.embed('Test text').then(r => console.log(r));
"
```

### Test Chunking
```bash
node -e "
const chunkText = require('./backend/src/vectorRag/core/chunkText');
const chunks = chunkText.chunkText('Lorem ipsum ' * 100, { chunkSize: 800 });
console.log('Created', chunks.length, 'chunks');
"
```

### Test Registry
```bash
node -e "
const loader = require('./backend/src/vectorRag/core/sourceRegistryLoader');
const { sources, errors } = loader.loadSourceRegistry();
console.log('Loaded', sources.length, 'sources, errors:', errors.length);
"
```

---

## Troubleshooting

### "GEMINI_API_KEY not configured"
- Check `GEMINI_API_KEY` environment variable
- Verify API is enabled in Google Cloud Console
- Verify API key has Generative AI permissions

### "Quota exhausted"
- Check billing in Google Cloud Console
- Upgrade API quota or plan
- Quota resets monthly

### "Rate limited"
- Implement exponential backoff with `retryAfter` header
- Reduce batch size
- Spread requests over time

### "No sources loaded"
- Check sourceRegistry.json exists at `backend/src/vectorRag/ingestion/sourceRegistry.json`
- Verify JSON syntax is valid
- Check errors array in response for validation details

### "Embedding dimension mismatch"
- Ensure all embeddings use same model (embedding-001 = 768 dims)
- Don't mix different embedding models

---

## Status Checks

### Is Vector RAG Enabled?
```bash
echo $RAG_VECTOR_ENABLED  # Should be 'false'
```

### Is JSON RAG Still Active?
```bash
echo $RAG_MODE  # Should be 'json'
```

### Are Models Registered?
```javascript
const mongoose = require('mongoose');
const models = mongoose.modelNames();
console.log(models); // Should include vectorKnowledgeSources, vectorKnowledgeChunks
```

---

**Last Updated:** 2026-05-23  
**Status:** Core Implementation Complete
