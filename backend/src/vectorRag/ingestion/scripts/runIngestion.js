#!/usr/bin/env node

/**
 * RAG Ingestion CLI Script
 * Usage:
 *   npm run rag:ingest              # Full ingestion
 *   npm run rag:ingest:dry          # Dry run (no database writes)
 *   node runIngestion.js --dry-run  # Explicit dry run
 *   node runIngestion.js --max-chunks=1000  # Limit chunks
 */

const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
dotenv.config({
  path: path.resolve(__dirname, '../../../../.env'),
});
dotenv.config({
  path: path.resolve(__dirname, '../../../../.env.local'),
});

const IngestionService = require('../ingestAllSources');
const EmbeddingClient = require('../../core/embeddingClient');
const VectorKnowledgeSource = require('../../models/VectorKnowledgeSource');
const VectorKnowledgeChunk = require('../../models/VectorKnowledgeChunk');

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    dryRun: process.env.RAG_INGEST_DRY_RUN === 'true' || args.includes('--dry-run'),
    maxChunks: parseInt(process.env.RAG_INGEST_MAX_CHUNKS || 10000, 10),
    delayMs: parseInt(process.env.RAG_INGEST_DELAY_MS || 0, 10),
    verbose: args.includes('--verbose'),
  };

  // Parse additional args
  for (const arg of args) {
    if (arg.startsWith('--max-chunks=')) {
      config.maxChunks = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--delay=')) {
      config.delayMs = parseInt(arg.split('=')[1], 10);
    }
  }

  return config;
}

/**
 * Main ingestion runner
 */
async function main() {
  const args = parseArgs();

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║       MatriSense Vector RAG Ingestion  ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`Configuration:`);
  console.log(`  Dry Run: ${args.dryRun ? '✓' : '✗'}`);
  console.log(`  Max Chunks: ${args.maxChunks}`);
  console.log(`  Delay (ms): ${args.delayMs}`);
  console.log(`  Verbose: ${args.verbose ? '✓' : '✗'}\n`);

  // Check environment
  if (!process.env.MONGODB_URI) {
    console.error('ERROR: MONGODB_URI environment variable not set');
    process.exit(1);
  }

  if (!args.dryRun && !process.env.GEMINI_API_KEY) {
    console.warn('WARNING: GEMINI_API_KEY not set. Embeddings will fail.');
    console.warn('Run with --dry-run to test without embeddings.\n');
  }

  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✓ Connected to MongoDB\n');

    // Initialize services
    const embeddingClient = new EmbeddingClient({
      provider: process.env.EMBEDDING_PROVIDER || 'gemini',
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_EMBEDDING_MODEL || 'embedding-001',
    });

    // Check embedding client
    const clientStatus = embeddingClient.getStatus();
    console.log('Embedding Client Status:');
    console.log(`  Initialized: ${clientStatus.initialized ? '✓' : '✗'}`);
    if (clientStatus.providerStatus) {
      console.log(`  Provider Ready: ${clientStatus.providerStatus.ready ? '✓' : '✗'}`);
      if (!clientStatus.providerStatus.ready) {
        console.log(`  Reason: ${clientStatus.lastError}`);
      }
    }
    console.log();

    // Create ingestion service
    const ingestionService = new IngestionService({
      dryRun: args.dryRun,
      maxChunks: args.maxChunks,
      delayBetweenEmbeddings: args.delayMs,
      embeddingClient: args.dryRun ? null : embeddingClient,
      VectorKnowledgeSource: args.dryRun ? null : VectorKnowledgeSource,
      VectorKnowledgeChunk: args.dryRun ? null : VectorKnowledgeChunk,
    });

    // Run ingestion
    console.log('Starting ingestion...\n');
    const startTime = Date.now();
    const summary = await ingestionService.ingestAll();
    const endTime = Date.now();

    // Print summary
    IngestionService.printSummary(summary);

    // Print timing
    const elapsedMs = endTime - startTime;
    const elapsedMin = (elapsedMs / 60000).toFixed(2);
    console.log(`Completed in ${elapsedMin} minutes (${elapsedMs}ms)`);

    if (args.dryRun) {
      console.log('\n[DRY RUN] No changes were written to database.\n');
    }

    // Determine exit code
    const exitCode = summary.status === 'ERROR' ? 1 : 0;
    console.log(`Exit Code: ${exitCode}\n`);
    process.exit(exitCode);
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    if (args.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    // Cleanup
    try {
      await mongoose.disconnect();
    } catch (err) {
      // Ignore
    }
  }
}

// Run
main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
