#!/usr/bin/env node

/**
 * Vector RAG Ingestion Smoke Test
 * Tests basic ingestion functionality and data integrity
 */

const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

const VectorKnowledgeSource = require('../models/VectorKnowledgeSource');
const VectorKnowledgeChunk = require('../models/VectorKnowledgeChunk');

class IngestionSmokeTest {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: [],
    };
  }

  async run() {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║    Vector RAG Ingestion Smoke Test     ║');
    console.log('╚════════════════════════════════════════╝\n');

    try {
      // Test 1: MongoDB connection
      await this.testMongoConnection();

      // Test 2: Source registry loads
      await this.testSourceRegistry();

      // Test 3: VectorKnowledgeSource records exist
      await this.testSourceRecords();

      // Test 4: VectorKnowledgeChunk count > 0
      await this.testChunkCount();

      // Test 5: Chunk document structure
      await this.testChunkStructure();

      // Test 6: Metadata quality
      await this.testMetadataQuality();

      this.printSummary();
      process.exit(this.results.failed === 0 ? 0 : 1);
    } catch (error) {
      console.error('\n✗ FATAL ERROR:', error.message);
      process.exit(1);
    }
  }

  async testMongoConnection() {
    const testName = 'MongoDB Connection';
    try {
      if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI not set');
      }

      // Connect if not already connected
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGODB_URI, {
          serverSelectionTimeoutMS: 5000,
        });
      }

      const state = mongoose.connection.readyState;
      if (state === 1) {
        this.passTest(testName, 'Connected to MongoDB');
      } else {
        this.failTest(testName, `Connection state: ${state}`);
      }
    } catch (error) {
      this.failTest(testName, error.message);
    }
  }

  async testSourceRegistry() {
    const testName = 'Source Registry Loads';
    try {
      const { loadSourceRegistry } = require('../core/sourceRegistryLoader');
      const { sources, errors } = loadSourceRegistry();

      if (sources.length === 0) {
        this.failTest(testName, 'No sources loaded from registry');
      } else if (errors.length > 0) {
        this.passTest(testName, `Loaded ${sources.length} sources (${errors.length} warnings)`);
      } else {
        this.passTest(testName, `Loaded ${sources.length} sources`);
      }
    } catch (error) {
      this.failTest(testName, error.message);
    }
  }

  async testSourceRecords() {
    const testName = 'VectorKnowledgeSource Records Exist';
    try {
      const count = await VectorKnowledgeSource.countDocuments();

      if (count === 0) {
        this.failTest(testName, 'No source records in database');
      } else {
        this.passTest(testName, `Found ${count} source records`);

        // Sample a few records
        const samples = await VectorKnowledgeSource.find().limit(3);
        for (const source of samples) {
          console.log(`  - ${source.sourceId}: ${source.ingestionStatus}`);
        }
      }
    } catch (error) {
      this.failTest(testName, error.message);
    }
  }

  async testChunkCount() {
    const testName = 'VectorKnowledgeChunk Count > 0';
    try {
      const count = await VectorKnowledgeChunk.countDocuments();

      if (count === 0) {
        this.failTest(testName, 'No chunks ingested');
      } else {
        this.passTest(testName, `Found ${count} chunks`);
      }
    } catch (error) {
      this.failTest(testName, error.message);
    }
  }

  async testChunkStructure() {
    const testName = 'Chunk Document Structure';
    try {
      const chunk = await VectorKnowledgeChunk.findOne();

      if (!chunk) {
        this.failTest(testName, 'No chunks to inspect');
        return;
      }

      const issues = [];

      if (!chunk.sourceId) issues.push('Missing sourceId');
      if (!chunk.text) issues.push('Missing text');
      if (!chunk.textHash) issues.push('Missing textHash');
      if (!chunk.metadata) issues.push('Missing metadata');

      if (issues.length > 0) {
        this.failTest(testName, `Issues: ${issues.join(', ')}`);
      } else {
        this.passTest(testName, 'Chunk has required fields');
        console.log(`  - sourceId: ${chunk.sourceId}`);
        console.log(`  - textLength: ${chunk.text.length} chars`);
        console.log(`  - textHash: ${chunk.textHash.substring(0, 16)}...`);
        console.log(`  - metadata.sourceKind: ${chunk.metadata.sourceKind}`);
      }
    } catch (error) {
      this.failTest(testName, error.message);
    }
  }

  async testMetadataQuality() {
    const testName = 'Metadata Quality';
    try {
      const chunks = await VectorKnowledgeChunk.find().limit(20);

      if (chunks.length === 0) {
        this.failTest(testName, 'No chunks to analyze');
        return;
      }

      let withEmbedding = 0;
      let withSymptoms = 0;
      let withEvidenceTags = 0;
      let withRiskLevel = 0;

      for (const chunk of chunks) {
        if (chunk.embedding && chunk.embedding.length > 0) withEmbedding++;
        if (chunk.metadata.symptoms && chunk.metadata.symptoms.length > 0) withSymptoms++;
        if (chunk.metadata.evidenceTags && chunk.metadata.evidenceTags.length > 0) {
          withEvidenceTags++;
        }
        if (chunk.metadata.riskLevel) withRiskLevel++;
      }

      const total = chunks.length;
      this.passTest(testName, 'Metadata enrichment analysis');
      console.log(`  - Chunks with embedding: ${withEmbedding}/${total}`);
      console.log(`  - Chunks with detected symptoms: ${withSymptoms}/${total}`);
      console.log(`  - Chunks with evidence tags: ${withEvidenceTags}/${total}`);
      console.log(`  - Chunks with risk level: ${withRiskLevel}/${total}`);
    } catch (error) {
      this.failTest(testName, error.message);
    }
  }

  passTest(name, message) {
    this.results.passed++;
    this.results.tests.push({ name, status: 'PASS', message });
    console.log(`✓ ${name}`);
    if (message) console.log(`  ${message}`);
  }

  failTest(name, message) {
    this.results.failed++;
    this.results.tests.push({ name, status: 'FAIL', message });
    console.log(`✗ ${name}`);
    if (message) console.log(`  ${message}`);
  }

  printSummary() {
    console.log('\n========== TEST SUMMARY ==========');
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Total:  ${this.results.passed + this.results.failed}`);
    console.log('=================================\n');

    if (this.results.failed === 0) {
      console.log('✓ ALL TESTS PASSED');
    } else {
      console.log('✗ SOME TESTS FAILED');
    }
  }
}

// Run test
const test = new IngestionSmokeTest();
test.run().catch(console.error);
