#!/usr/bin/env node

const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env.local') });

const IngestionService = require('../ingestAllSources');
const EmbeddingClient = require('../../core/embeddingClient');
const VectorKnowledgeSource = require('../../models/VectorKnowledgeSource');
const VectorKnowledgeChunk = require('../../models/VectorKnowledgeChunk');

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    dryRun: process.env.RAG_INGEST_DRY_RUN === 'true' || args.includes('--dry-run'),
    maxChunks: parseInt(process.env.RAG_INGEST_MAX_CHUNKS || 10000, 10),
    delayMs: parseInt(process.env.RAG_INGEST_DELAY_MS || 0, 10),
    verbose: args.includes('--verbose'),
    sourceId: null,
    sourceKind: null,
    skipPdf: args.includes('--skip-pdf'),
    onlyCards: args.includes('--only-cards'),
    onlyMd: args.includes('--only-md'),
    withEmbeddingCheck: args.includes('--with-embedding-check'),
    embeddingConcurrency: parseInt(process.env.EMBEDDING_CONCURRENCY || 1, 10),
  };

  for (const arg of args) {
    if (arg.startsWith('--max-chunks=')) config.maxChunks = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--delay=')) config.delayMs = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--source-id=')) config.sourceId = arg.split('=')[1];
    else if (arg.startsWith('--source-kind=')) config.sourceKind = arg.split('=')[1]?.toUpperCase();
  }

  return config;
}

async function main() {
  const args = parseArgs();

  console.log('\n========================================');
  console.log('       MatriSense Vector RAG Ingestion');
  console.log('========================================\n');

  console.log('Configuration:');
  console.log(`  Dry Run: ${args.dryRun ? 'yes' : 'no'}`);
  console.log(`  Max Chunks: ${args.maxChunks}`);
  console.log(`  Delay (ms): ${args.delayMs}`);
  console.log(`  Source ID: ${args.sourceId || 'all'}`);
  console.log(`  Source Kind: ${args.sourceKind || 'all'}`);
  console.log(`  Skip PDF: ${args.skipPdf ? 'yes' : 'no'}`);
  console.log(`  Only Cards: ${args.onlyCards ? 'yes' : 'no'}`);
  console.log(`  Only Markdown: ${args.onlyMd ? 'yes' : 'no'}`);
  console.log(`  Embedding Check in Dry Run: ${args.withEmbeddingCheck ? 'yes' : 'no'}`);
  console.log(`  Embedding Concurrency: ${args.embeddingConcurrency}`);
  console.log(`  Verbose: ${args.verbose ? 'yes' : 'no'}\n`);

  if (!args.dryRun && !process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI environment variable not set');
    process.exit(1);
  }

  const provider = (process.env.EMBEDDING_PROVIDER || 'local').toLowerCase();

  try {
    if (!args.dryRun) {
      console.log('Connecting to MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
      console.log('Connected to MongoDB\n');
    } else {
      console.log('Dry run mode: skipping MongoDB connection.\n');
    }

    const embeddingClient = new EmbeddingClient({
      provider,
      apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
      model: provider === 'gemini'
        ? process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004'
        : process.env.EMBEDDING_MODEL || 'Xenova/multilingual-e5-small',
      dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || 384, 10),
    });

    const clientStatus = embeddingClient.getStatus();
    console.log('Embedding Client Status:');
    console.log(`  Initialized: ${clientStatus.initialized ? 'yes' : 'no'}`);
    console.log(`  Provider: ${provider}`);
    if (clientStatus.providerStatus) {
      console.log(`  Provider Ready: ${clientStatus.providerStatus.ready ? 'yes' : 'no'}`);
    }
    console.log();

    const ingestionService = new IngestionService({
      dryRun: args.dryRun,
      maxChunks: args.maxChunks,
      delayBetweenEmbeddings: args.delayMs,
      embeddingClient: (args.dryRun && !args.withEmbeddingCheck) || provider === 'none' ? null : embeddingClient,
      VectorKnowledgeSource: args.dryRun ? null : VectorKnowledgeSource,
      VectorKnowledgeChunk: args.dryRun ? null : VectorKnowledgeChunk,
      sourceId: args.sourceId,
      sourceKind: args.sourceKind,
      skipPdf: args.skipPdf,
      onlyCards: args.onlyCards,
      onlyMd: args.onlyMd,
      withEmbeddingCheck: args.withEmbeddingCheck,
      embeddingConcurrency: args.embeddingConcurrency,
      embeddingTimeoutMs: parseInt(process.env.RAG_EMBEDDING_TIMEOUT_MS || 45000, 10),
      upsertTimeoutMs: parseInt(process.env.RAG_UPSERT_TIMEOUT_MS || 20000, 10),
      extractTimeoutMs: parseInt(process.env.RAG_EXTRACTION_TIMEOUT_MS || 60000, 10),
    });

    const startTime = Date.now();
    const summary = await ingestionService.ingestAll();
    const endTime = Date.now();

    IngestionService.printSummary(summary);
    console.log(`Completed in ${((endTime - startTime) / 1000).toFixed(2)}s`);

    if (args.dryRun) {
      console.log('\n[DRY RUN] No changes were written to database.');
    }

    const exitCode = summary.status === 'ERROR' ? 1 : 0;
    console.log(`Exit Code: ${exitCode}\n`);
    process.exit(exitCode);
  } catch (error) {
    console.error('\nFATAL ERROR:', error.message);
    if (args.verbose) console.error(error.stack);
    process.exit(1);
  } finally {
    try { await mongoose.disconnect(); } catch (err) {}
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
