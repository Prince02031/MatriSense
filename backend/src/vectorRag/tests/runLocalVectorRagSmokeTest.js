#!/usr/bin/env node

const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

const EmbeddingClient = require('../core/embeddingClient');
const { loadSourceRegistry } = require('../core/sourceRegistryLoader');
const IngestionService = require('../ingestion/ingestAllSources');
const { retrieveRuleAware } = require('../retrieval/ruleAwareVectorRetriever');
const VectorKnowledgeChunk = require('../models/VectorKnowledgeChunk');

async function run() {
  const provider = (process.env.EMBEDDING_PROVIDER || 'local').toLowerCase();
  const model = process.env.EMBEDDING_MODEL || 'Xenova/multilingual-e5-small';
  const dimensions = parseInt(process.env.EMBEDDING_DIMENSIONS || 384, 10);

  console.log('\n=== Local Vector RAG Smoke Test ===');
  console.log(`provider=${provider}`);
  console.log(`model=${model}`);
  console.log(`dimensions=${dimensions}\n`);

  const embeddingClient = new EmbeddingClient({ provider, model, dimensions });
  const emb = await embeddingClient.embed(
    'pregnancy severe headache and blurred vision danger sign',
    { inputType: 'query' }
  );

  if (!emb.ok) {
    console.error(`Embedding failed: ${emb.error || emb.message}`);
    process.exit(1);
  }
  if (emb.dimensions !== 384) {
    console.error(`Expected 384 dimensions, got ${emb.dimensions}`);
    process.exit(1);
  }
  console.log(`Embedding OK (dim=${emb.dimensions})`);

  const { sources, errors } = loadSourceRegistry();
  if (!Array.isArray(sources) || sources.length === 0) {
    console.error('Source registry missing or empty.');
    process.exit(1);
  }
  console.log(`Source registry OK (${sources.length} sources, ${errors.length} warnings)`);

  const dryRunService = new IngestionService({
    dryRun: true,
    maxChunks: 20,
    embeddingClient: null,
  });
  const drySourceResult = await dryRunService.ingestSource(sources[0]);
  console.log(`Dry-run ingestion sample source status: ${drySourceResult.status}`);

  if (!process.env.MONGODB_URI) {
    console.log('No MONGODB_URI set. Skipping retrieval check.');
    process.exit(0);
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const chunkCount = await VectorKnowledgeChunk.countDocuments();
  console.log(`Vector chunks in DB: ${chunkCount}`);

  if (chunkCount === 0) {
    console.log('No chunks found. Run: npm run rag:ingest');
    await mongoose.disconnect();
    process.exit(0);
  }

  const decision = {
    riskLevel: 'HIGH',
    allowedGuidanceType: 'URGENT_ESCALATION',
    evidenceTags: ['DANGER_SIGN', 'PREECLAMPSIA_RISK'],
  };
  const caseState = {
    symptoms: ['headache', 'blurred_vision'],
    rawInput: 'আমার মাথা খুব ব্যথা করছে আর চোখে ঝাপসা দেখছি',
    meta: {},
  };
  console.log(`\nDecision evidenceTags: ${decision.evidenceTags.join(', ')}`);
  console.log(`Case symptoms: ${caseState.symptoms.join(', ')}`);
  console.log(`Case raw input: ${caseState.rawInput}`);

  async function runRetrievalForAudience(audience) {
    const retrieval = await retrieveRuleAware({
      decision,
      caseState,
      patientInput: caseState.rawInput,
      audience,
      topK: 8,
      embeddingClient,
      VectorKnowledgeChunk,
    });

    console.log(`\n[${audience}] ok=${retrieval.ok} fallbackRecommended=${retrieval.fallbackRecommended}`);
    console.log(
      `[${audience}] retrieved=${retrieval.totalRetrieved} rejected=${retrieval.totalRejected}`
    );
    console.log(`[${audience}] rawInputIncluded=${retrieval.rawInputIncluded ? 'true' : 'false'}`);
    console.log(`[${audience}] queryText=${retrieval.queryText}`);
    console.log(`[${audience}] filters=${JSON.stringify(retrieval.filtersApplied)}`);
    if (retrieval.warnings?.length) {
      console.log(`[${audience}] warnings=${retrieval.warnings.join(' | ')}`);
    }

    if (Array.isArray(retrieval.retrievedChunks) && retrieval.retrievedChunks.length > 0) {
      retrieval.retrievedChunks.slice(0, 5).forEach((c, i) => {
        console.log(`\n[${audience} ACCEPT ${i + 1}] ${c.sourceTitle || c.sourceId}`);
        console.log(`chunkId=${c.chunkId} sourceKind=${c.sourceKind} score=${c.score}`);
        console.log(`guidanceTypes=${(c.guidanceTypes || []).join(', ')}`);
        console.log(`riskLevelAllowed=${(c.riskLevelAllowed || []).join(', ')}`);
        console.log(`audience=${(c.audience || []).join(', ')}`);
        console.log(`evidenceTags=${(c.evidenceTags || []).join(', ')}`);
      });
    }

    if (Array.isArray(retrieval.rejectedChunks) && retrieval.rejectedChunks.length > 0) {
      retrieval.rejectedChunks.slice(0, 5).forEach((c, i) => {
        console.log(`\n[${audience} REJECT ${i + 1}] ${c.sourceTitle || c.sourceId}`);
        console.log(`chunkId=${c.chunkId} sourceKind=${c.sourceKind} score=${c.score}`);
        console.log(`guidanceTypes=${(c.guidanceTypes || []).join(', ')}`);
        console.log(`riskLevelAllowed=${(c.riskLevelAllowed || []).join(', ')}`);
        console.log(`audience=${(c.audience || []).join(', ')}`);
        console.log(`evidenceTags=${(c.evidenceTags || []).join(', ')}`);
        console.log(`symptoms=${(c.symptoms || []).join(', ')}`);
        console.log(`trusted=${c.trusted}`);
        console.log(`rejectionReasons=${(c.rejectionReasons || []).join(' | ')}`);
      });
    }
  }

  await runRetrievalForAudience('PATIENT');
  await runRetrievalForAudience('HEALTH_WORKER');

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('Smoke test failed:', error.message);
  try {
    await mongoose.disconnect();
  } catch (err) {
    // ignore
  }
  process.exit(1);
});
