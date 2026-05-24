/**
 * Ingestion Service for Vector RAG
 * Orchestrates source loading, chunking, embedding, and database updates
 */

const path = require('path');
const knowledgeCardAdapter = require('../adapters/knowledgeCardAdapter');
const markdownAdapter = require('../adapters/markdownAdapter');
const pdfAdapter = require('../adapters/pdfAdapter');
const htmlAdapter = require('../adapters/htmlAdapter');
const { loadSourceRegistry } = require('../core/sourceRegistryLoader');
const { chunkText, chunkKnowledgeCard, chunkMarkdown, chunkPDF } = require('../core/chunkText');
const { generateContentHash } = require('../core/hashContent');
const { EmbeddingCache, DatabaseEmbeddingChecker } = require('./embeddingCache');

const logger = console; // Replace with proper logger if available

/**
 * Main ingestion service
 */
class IngestionService {
  constructor(config = {}) {
    this.config = {
      dryRun: config.dryRun || false,
      maxChunks: parseInt(config.maxChunks || process.env.RAG_INGEST_MAX_CHUNKS || 10000, 10),
      delayBetweenEmbeddings: parseInt(config.delayBetweenEmbeddings || 0, 10),
      embeddingClient: config.embeddingClient,
      VectorKnowledgeSource: config.VectorKnowledgeSource,
      VectorKnowledgeChunk: config.VectorKnowledgeChunk,
    };

    this.cache = new EmbeddingCache();
    this.stats = {
      sourcesProcessed: 0,
      chunksCreated: 0,
      chunksUpdated: 0,
      chunksSkipped: 0,
      embeddingsCreated: 0,
      embeddingsFailed: 0,
      sourcesPending: 0,
      sourcesIngested: 0,
      sourcesPartial: 0,
      sourcesError: 0,
      sourcesSkipped: 0,
      missingFiles: [],
      ocrSkipped: [],
      errors: [],
    };
    this.quotaExhausted = false;
  }

  /**
   * Get source adapter for given source kind
   * @param {string} sourceKind - Type of source
   * @returns {object} Adapter module
   */
  getAdapter(sourceKind) {
    switch (sourceKind) {
      case 'KNOWLEDGE_CARD':
        return knowledgeCardAdapter;
      case 'MARKDOWN':
        return markdownAdapter;
      case 'PDF':
        return pdfAdapter;
      case 'HTML':
        return htmlAdapter;
      default:
        throw new Error(`Unknown source kind: ${sourceKind}`);
    }
  }

  /**
   * Load records from source using appropriate adapter
   * @param {object} source - Source entry from registry
   * @returns {Promise<array>} Array of normalized records
   */
  async loadSource(source) {
    try {
      const adapter = this.getAdapter(source.sourceKind);

      // Resolve file path relative to project root (4 levels up from ingestion dir)
      const projectRoot = path.join(__dirname, '../../../..');
      const filePath = path.resolve(projectRoot, source.path);

      if (source.sourceKind === 'KNOWLEDGE_CARD') {
        return await adapter.adapt(filePath, source.sourceId);
      } else {
        return await adapter.adapt(filePath, source);
      }
    } catch (error) {
      this.stats.errors.push(`[${source.sourceId}] Load failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if file exists (with project root resolution)
   * @param {string} filePath - File path from registry
   * @returns {boolean}
   */
  fileExists(filePath) {
    try {
      // Resolve relative to project root (4 levels up from ingestion dir)
      const projectRoot = path.join(__dirname, '../../../..');
      const resolved = path.resolve(projectRoot, filePath);
      const fs = require('fs');
      return fs.existsSync(resolved);
    } catch (error) {
      return false;
    }
  }

  /**
   * Chunk records into smaller pieces
   * @param {array} records - Normalized records from adapter
   * @returns {array} Chunked records
   */
  chunkRecords(records) {
    const chunked = [];

    for (const record of records) {
      if (!record.text) continue;

      // Use specialized chunking based on source kind
      let chunks = [];

      if (record.sourceKind === 'KNOWLEDGE_CARD') {
        chunks = chunkText(record.text, {
          chunkSize: 700,
          overlap: 150,
          minChunkSize: 50, // Allow smaller chunks for knowledge cards
        });
      } else if (record.sourceKind === 'MARKDOWN') {
        chunks = chunkText(record.text, {
          chunkSize: 800,
          overlap: 200,
          minChunkSize: 100,
        });
      } else if (record.sourceKind === 'PDF') {
        chunks = chunkText(record.text, {
          chunkSize: 900,
          overlap: 250,
          minChunkSize: 100,
        });
      } else if (record.sourceKind === 'HTML') {
        chunks = chunkText(record.text, {
          chunkSize: 800,
          overlap: 200,
          minChunkSize: 100,
        });
      }

      // Create chunked records
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        chunked.push({
          ...record,
          text: chunk.text,
          metadata: {
            ...record.metadata,
            chunkIndex: i,
            totalChunks: chunks.length,
            originalLength: record.text.length,
            chunkLength: chunk.text.length,
          },
        });
      }
    }

    return chunked;
  }

  /**
   * Create chunk document for database
   * @param {object} record - Normalized record
   * @param {number} index - Chunk index
   * @param {string} embedding - Embedding vector
   * @returns {object} Chunk document for MongoDB
   */
  createChunkDocument(record, index, embedding) {
    const { textHash, metadataHash, combinedHash } = generateContentHash(
      record.text,
      record.metadata
    );

    return {
      chunkId: `${record.sourceId}_${index}`,
      sourceId: record.sourceId,
      sourceKind: record.sourceKind,
      sourceTitle: record.sourceTitle,
      sourcePath: record.sourcePath,
      sourceUrl: record.sourceUrl || null,
      pageStart: record.pageStart,
      pageEnd: record.pageEnd,
      sectionTitle: record.sectionTitle,
      text: record.text,
      textHash,
      language: (record.metadata?.language || ['en'])[0] || 'en',
      embedding,
      symptoms: record.metadata?.symptoms || [],
      evidenceTags: record.metadata?.evidenceTags || [],
      riskLevelAllowed: record.metadata?.riskLevelAllowed || ['HIGH', 'MEDIUM', 'LOW'],
      guidanceTypes: record.metadata?.guidanceType
        ? [record.metadata.guidanceType]
        : record.metadata?.allowedGuidanceTypes || [],
      audience: record.metadata?.audiences || ['HEALTH_WORKER'],
      sourceUse: record.metadata?.sourceUse || null,
      trusted: record.metadata?.trusted !== false,
      priority: record.metadata?.priority || 3,
      fromKnowledgeCard: record.sourceKind === 'KNOWLEDGE_CARD',
    };
  }

  /**
   * Ingest a single source
   * @param {object} source - Source entry from registry
   * @returns {Promise<object>} Ingestion result
   */
  async ingestSource(source) {
    this.stats.sourcesProcessed++;

    // Check if file exists
    if (!this.fileExists(source.path)) {
      this.stats.missingFiles.push(source.path);
      this.stats.sourcesError++;
      logger.warn(`[${source.sourceId}] File not found: ${source.path}`);
      return {
        sourceId: source.sourceId,
        status: 'ERROR',
        chunksCreated: 0,
        error: 'File not found',
      };
    }

    try {
      // Load and adapt source
      let records = await this.loadSource(source);

      // Check for PDF-specific errors
      if (source.sourceKind === 'PDF' && records.length === 0) {
        // Check if it was OCR issue or other error
        logger.warn(`[${source.sourceId}] PDF extraction failed`);
        this.stats.sourcesError++;
        return {
          sourceId: source.sourceId,
          status: 'ERROR',
          chunksCreated: 0,
          error: 'PDF extraction failed',
        };
      }

      // Chunk records
      const chunks = this.chunkRecords(records);

      if (chunks.length === 0) {
        logger.warn(`[${source.sourceId}] No chunks created`);
        this.stats.sourcesError++;
        return {
          sourceId: source.sourceId,
          status: 'ERROR',
          chunksCreated: 0,
          error: 'No chunks created',
        };
      }

      // Embed chunks
      let created = 0;
      let updated = 0;
      let skipped = 0;
      let failed = 0;
      const dbChecker = new DatabaseEmbeddingChecker(this.config.VectorKnowledgeChunk);

      for (let i = 0; i < chunks.length; i++) {
        // Check max chunks limit
        if (this.stats.embeddingsCreated + created >= this.config.maxChunks) {
          logger.warn(
            `[${source.sourceId}] Max chunks (${this.config.maxChunks}) reached, stopping ingestion`
          );
          this.stats.sourcesPartial++;
          break;
        }

        if (this.quotaExhausted) {
          logger.warn(`[${source.sourceId}] Quota exhausted, marking PARTIAL`);
          this.stats.sourcesPartial++;
          break;
        }

        const chunk = chunks[i];
        const { textHash } = generateContentHash(chunk.text, chunk.metadata);

        // Check cache
        const cached = this.cache.get(textHash);
        if (cached) {
          skipped++;
          this.cache.recordSaved();
          continue;
        }

        // Check database
        const existing = await dbChecker.checkByHash(textHash);
        if (existing) {
          updated++;
          this.cache.recordSaved();
          continue;
        }

        // Embed if not in dry run
        let embedding = null;
        if (!this.config.dryRun && this.config.embeddingClient) {
          // Apply delay if configured
          if (this.config.delayBetweenEmbeddings > 0) {
            await new Promise((resolve) =>
              setTimeout(resolve, this.config.delayBetweenEmbeddings)
            );
          }

          const result = await this.config.embeddingClient.embed(chunk.text);

          if (result.error) {
            if (result.error === 'QUOTA_EXHAUSTED') {
              this.quotaExhausted = true;
              logger.error(`[${source.sourceId}] Quota exhausted`);
              this.stats.sourcesPartial++;
              break;
            } else if (result.error === 'RATE_LIMITED') {
              logger.warn(`[${source.sourceId}] Rate limited, waiting ${result.retryAfter}ms`);
              await new Promise((resolve) =>
                setTimeout(resolve, result.retryAfter || 1000)
              );
              // Retry once
              const retryResult = await this.config.embeddingClient.embed(chunk.text);
              if (retryResult.error) {
                failed++;
                this.stats.embeddingsFailed++;
                continue;
              }
              embedding = retryResult.embedding;
            } else {
              failed++;
              this.stats.embeddingsFailed++;
              logger.warn(`[${source.sourceId}] Embedding failed: ${result.message}`);
              continue;
            }
          } else {
            embedding = result.embedding;
          }
        }

        // Save to database if not dry run
        if (!this.config.dryRun && this.config.VectorKnowledgeChunk) {
          try {
            const chunkDoc = this.createChunkDocument(chunk, i, embedding);
            await this.config.VectorKnowledgeChunk.updateOne(
              { chunkId: chunkDoc.chunkId },
              { $set: chunkDoc },
              { upsert: true }
            );
            created++;
            this.stats.embeddingsCreated++;
          } catch (error) {
            failed++;
            logger.warn(`[${source.sourceId}] Failed to save chunk: ${error.message}`);
          }
        } else if (this.config.dryRun) {
          created++; // Count as created in dry run
        }

        // Add to cache
        if (embedding) {
          this.cache.set(textHash, chunkDoc?.chunkId || `${source.sourceId}_${i}`, embedding);
        }
      }

      // Update source status
      if (!this.config.dryRun && this.config.VectorKnowledgeSource) {
        try {
          const sourceDoc = await this.config.VectorKnowledgeSource.findOne({
            sourceId: source.sourceId,
          });

          if (sourceDoc) {
            if (this.quotaExhausted && created < chunks.length) {
              await sourceDoc.markPartialIngestion(created, 'Quota exhausted');
              this.stats.sourcesPartial++;
            } else if (failed > 0 || created < chunks.length) {
              await sourceDoc.markPartialIngestion(created, `Failed: ${failed} chunks`);
              this.stats.sourcesPartial++;
            } else {
              await sourceDoc.markIngested(created);
              this.stats.sourcesIngested++;
            }
          }
        } catch (error) {
          logger.warn(`[${source.sourceId}] Failed to update source status: ${error.message}`);
        }
      }

      this.stats.chunksCreated += created;
      this.stats.chunksUpdated += updated;
      this.stats.chunksSkipped += skipped;

      return {
        sourceId: source.sourceId,
        status: 'SUCCESS',
        chunksCreated: created,
        chunksUpdated: updated,
        chunksSkipped: skipped,
        chunksFailed: failed,
      };
    } catch (error) {
      this.stats.sourcesError++;
      this.stats.errors.push(`[${source.sourceId}] ${error.message}`);
      logger.error(`[${source.sourceId}] Ingestion error:`, error.message);

      return {
        sourceId: source.sourceId,
        status: 'ERROR',
        chunksCreated: 0,
        error: error.message,
      };
    }
  }

  /**
   * Ingest all sources from registry
   * @returns {Promise<object>} Ingestion summary
   */
  async ingestAll() {
    logger.info('Starting ingestion...');
    logger.info(
      `Configuration: dryRun=${this.config.dryRun}, maxChunks=${this.config.maxChunks}`
    );

    try {
      // Load registry
      const { sources, errors: registryErrors } = loadSourceRegistry();

      if (registryErrors.length > 0) {
        logger.warn('Registry load warnings:', registryErrors);
        this.stats.errors.push(...registryErrors);
      }

      if (sources.length === 0) {
        logger.error('No sources to ingest');
        return {
          status: 'ERROR',
          message: 'No sources found in registry',
          stats: this.stats,
        };
      }

      logger.info(`Loaded ${sources.length} sources from registry`);

      // Process each source
      const results = [];
      for (const source of sources) {
        const result = await this.ingestSource(source);
        results.push(result);

        // Stop if quota exhausted
        if (this.quotaExhausted) {
          logger.error('Quota exhausted, stopping ingestion');
          break;
        }
      }

      // Summary
      const summary = {
        status: this.quotaExhausted ? 'PARTIAL' : 'SUCCESS',
        totalSources: sources.length,
        stats: {
          ...this.stats,
          cacheStats: this.cache.getStats(),
        },
        results,
      };

      return summary;
    } catch (error) {
      logger.error('Fatal ingestion error:', error);
      return {
        status: 'ERROR',
        message: error.message,
        stats: this.stats,
      };
    }
  }

  /**
   * Print ingestion summary
   * @param {object} summary - Ingestion summary
   */
  static printSummary(summary) {
    logger.info('\n========== INGESTION SUMMARY ==========');
    logger.info(`Status: ${summary.status}`);
    logger.info(`Total Sources: ${summary.totalSources}`);
    logger.info(`\nChunks:`);
    logger.info(`  Created: ${summary.stats.chunksCreated}`);
    logger.info(`  Updated: ${summary.stats.chunksUpdated}`);
    logger.info(`  Skipped: ${summary.stats.chunksSkipped}`);
    logger.info(`\nEmbeddings:`);
    logger.info(`  Created: ${summary.stats.embeddingsCreated}`);
    logger.info(`  Failed: ${summary.stats.embeddingsFailed}`);
    logger.info(`\nSources:`);
    logger.info(`  Ingested: ${summary.stats.sourcesIngested}`);
    logger.info(`  Partial: ${summary.stats.sourcesPartial}`);
    logger.info(`  Error: ${summary.stats.sourcesError}`);
    logger.info(`\nCache Stats:`, summary.stats.cacheStats);
    if (summary.stats.missingFiles.length > 0) {
      logger.info(`\nMissing Files: ${summary.stats.missingFiles.length}`);
      for (const file of summary.stats.missingFiles) {
        logger.info(`  - ${file}`);
      }
    }
    if (summary.stats.errors.length > 0) {
      logger.info(`\nErrors: ${summary.stats.errors.length}`);
      for (const error of summary.stats.errors.slice(0, 10)) {
        logger.info(`  - ${error}`);
      }
      if (summary.stats.errors.length > 10) {
        logger.info(`  ... and ${summary.stats.errors.length - 10} more`);
      }
    }
    logger.info('========================================\n');
  }
}

module.exports = IngestionService;
