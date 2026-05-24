const path = require('path');
const knowledgeCardAdapter = require('../adapters/knowledgeCardAdapter');
const markdownAdapter = require('../adapters/markdownAdapter');
const pdfAdapter = require('../adapters/pdfAdapter');
const htmlAdapter = require('../adapters/htmlAdapter');
const { loadSourceRegistry } = require('../core/sourceRegistryLoader');
const { chunkText } = require('../core/chunkText');
const { generateContentHash } = require('../core/hashContent');
const { EmbeddingCache } = require('./embeddingCache');
const { normalizeChunkMetadata } = require('./normalizeChunkMetadata');

const logger = console;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

class IngestionService {
  constructor(config = {}) {
    this.config = {
      dryRun: config.dryRun || false,
      maxChunks: parseInt(config.maxChunks || process.env.RAG_INGEST_MAX_CHUNKS || 10000, 10),
      delayBetweenEmbeddings: parseInt(config.delayBetweenEmbeddings || 0, 10),
      embeddingClient: config.embeddingClient,
      VectorKnowledgeSource: config.VectorKnowledgeSource,
      VectorKnowledgeChunk: config.VectorKnowledgeChunk,
      sourceId: config.sourceId || null,
      sourceKind: config.sourceKind || null,
      skipPdf: !!config.skipPdf,
      onlyCards: !!config.onlyCards,
      onlyMd: !!config.onlyMd,
      withEmbeddingCheck: !!config.withEmbeddingCheck,
      embeddingTimeoutMs: parseInt(config.embeddingTimeoutMs || 45000, 10),
      upsertTimeoutMs: parseInt(config.upsertTimeoutMs || 20000, 10),
      extractTimeoutMs: parseInt(config.extractTimeoutMs || 60000, 10),
    };

    this.cache = new EmbeddingCache();
    this.stats = {
      sourcesProcessed: 0,
      sourcesSkipped: 0,
      sourcesError: 0,
      sourcesPartial: 0,
      sourcesIngested: 0,
      chunksCreated: 0,
      chunksUpdated: 0,
      chunksSkipped: 0,
      embeddingsCreated: 0,
      embeddingsFailed: 0,
      missingFiles: [],
      errors: [],
      slowestSource: { sourceId: null, ms: 0 },
      slowestEmbedding: { chunkId: null, ms: 0 },
      totalTimeMs: 0,
    };
    this.totalProcessedChunks = 0;
  }

  getAdapter(sourceKind) {
    if (sourceKind === 'KNOWLEDGE_CARD') return knowledgeCardAdapter;
    if (sourceKind === 'MARKDOWN') return markdownAdapter;
    if (sourceKind === 'PDF') return pdfAdapter;
    if (sourceKind === 'HTML') return htmlAdapter;
    throw new Error(`Unknown source kind: ${sourceKind}`);
  }

  filterSources(sources) {
    return sources.filter((s) => {
      if (this.config.sourceId && s.sourceId !== this.config.sourceId) return false;
      if (this.config.sourceKind && s.sourceKind !== this.config.sourceKind) return false;
      if (this.config.skipPdf && s.sourceKind === 'PDF') return false;
      if (this.config.onlyCards && s.sourceKind !== 'KNOWLEDGE_CARD') return false;
      if (this.config.onlyMd && s.sourceKind !== 'MARKDOWN') return false;
      return true;
    });
  }

  async loadSource(source) {
    const adapter = this.getAdapter(source.sourceKind);
    const projectRoot = path.join(__dirname, '../../../..');
    const filePath = path.resolve(projectRoot, source.path);
    logger.info(`  Extraction started: ${filePath}`);
    const adapted = await withTimeout(adapter.adapt(filePath, source), this.config.extractTimeoutMs, `${source.sourceId} extraction`);
    logger.info('  Extraction completed');
    if (source.sourceKind === 'PDF' && adapted && typeof adapted === 'object' && !Array.isArray(adapted)) {
      if (adapted.status !== 'SUCCESS') return [];
      return adapted.records || [];
    }
    return adapted;
  }

  chunkRecords(records) {
    const chunked = [];
    for (const record of records) {
      if (!record.text) continue;
      const chunks = chunkText(record.text, {
        chunkSize: record.sourceKind === 'PDF' ? 900 : 800,
        overlap: 200,
        minChunkSize: record.sourceKind === 'KNOWLEDGE_CARD' ? 50 : 100,
      });
      for (let i = 0; i < chunks.length; i++) {
        chunked.push({
          ...record,
          text: chunks[i].text,
          metadata: { ...record.metadata, chunkIndex: i, totalChunks: chunks.length },
        });
      }
    }
    return chunked;
  }

  createChunkDocument(record, index, embedding, providerMeta) {
    const { textHash } = generateContentHash(record.text, record.metadata);
    const normalized = normalizeChunkMetadata(record);
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
      language: normalized.language,
      embedding,
      embeddingProvider: providerMeta.provider,
      embeddingModel: providerMeta.model,
      embeddingDimensions: providerMeta.dimensions,
      symptoms: normalized.symptoms,
      evidenceTags: normalized.evidenceTags,
      riskLevelAllowed: normalized.riskLevelAllowed,
      guidanceTypes: normalized.guidanceTypes,
      audience: normalized.audience,
      sourceUse: normalized.sourceUse,
      trusted: normalized.trusted,
      priority: normalized.priority,
      fromKnowledgeCard: record.sourceKind === 'KNOWLEDGE_CARD',
    };
  }

  async ingestSource(source, idx = 0, totalSources = 1, providerMeta = {}) {
    const start = Date.now();
    this.stats.sourcesProcessed++;
    logger.info(`\n[${idx + 1}/${totalSources}] Processing source: ${source.sourceId} (${source.sourceKind})`);
    logger.info(`  Path: ${source.path}`);

    try {
      const records = await this.loadSource(source);
      const chunks = this.chunkRecords(records || []);
      logger.info(`  Raw chunks created: ${chunks.length}`);
      if (!chunks.length) {
        this.stats.sourcesSkipped++;
        return { sourceId: source.sourceId, status: 'SKIPPED', chunksCreated: 0 };
      }

      let created = 0;
      let updated = 0;
      let skipped = 0;
      let failed = 0;

      for (let i = 0; i < chunks.length; i++) {
        if (this.totalProcessedChunks >= this.config.maxChunks) {
          logger.warn('Max chunks reached, stopping ingestion');
          this.stats.sourcesPartial++;
          break;
        }

        const chunk = chunks[i];
        const { textHash } = generateContentHash(chunk.text, chunk.metadata);
        const chunkId = `${source.sourceId}_${i}`;
        logger.info(`  Chunk ${i + 1}/${chunks.length}: ${chunkId}`);

        const existing = (!this.config.dryRun && this.config.VectorKnowledgeChunk)
          ? await this.config.VectorKnowledgeChunk.findOne({
              sourceId: source.sourceId,
              textHash,
      embeddingProvider: providerMeta.provider || (process.env.EMBEDDING_PROVIDER || 'none'),
      embeddingModel: providerMeta.model || process.env.EMBEDDING_MODEL || null,
      embeddingDimensions: providerMeta.dimensions || (parseInt(process.env.EMBEDDING_DIMENSIONS || 0, 10) || null),
            }).select({ _id: 1 })
          : null;
        if (existing || this.cache.get(textHash)) {
          skipped++;
          this.stats.chunksSkipped++;
          logger.info('    skipped unchanged chunk');
          continue;
        }

        let embedding = null;
        if (this.config.embeddingClient) {
          if (this.config.delayBetweenEmbeddings > 0) {
            await new Promise((r) => setTimeout(r, this.config.delayBetweenEmbeddings));
          }
          logger.info('    embedding started');
          const embStart = Date.now();
          try {
            const embResult = await withTimeout(
              this.config.embeddingClient.embed(chunk.text, { inputType: 'passage' }),
              this.config.embeddingTimeoutMs,
              `${chunkId} embedding`
            );
            if (!embResult.ok || !embResult.embedding) {
              failed++;
              this.stats.embeddingsFailed++;
              logger.warn(`    embedding failed: ${embResult.error || embResult.message}`);
              continue;
            }
            embedding = embResult.embedding;
            const embMs = Date.now() - embStart;
            if (embMs > this.stats.slowestEmbedding.ms) {
              this.stats.slowestEmbedding = { chunkId, ms: embMs };
            }
            logger.info(`    embedding completed (${embMs}ms)`);
          } catch (error) {
            failed++;
            this.stats.embeddingsFailed++;
            logger.warn(`    embedding timeout/error: ${error.message}`);
            continue;
          }
        }

        if (!this.config.dryRun && this.config.VectorKnowledgeChunk) {
          const chunkDoc = this.createChunkDocument(chunk, i, embedding, providerMeta);
          logger.info('    upsert started');
          try {
            await withTimeout(
              this.config.VectorKnowledgeChunk.updateOne({ chunkId: chunkDoc.chunkId }, { $set: chunkDoc }, { upsert: true }),
              this.config.upsertTimeoutMs,
              `${chunkId} upsert`
            );
            created++;
            this.stats.chunksCreated++;
            if (embedding) this.stats.embeddingsCreated++;
            logger.info('    upsert completed');
          } catch (error) {
            failed++;
            logger.warn(`    upsert failed: ${error.message}`);
          }
        } else {
          created++;
        }

        this.totalProcessedChunks++;
      }

      if (!this.config.dryRun && this.config.VectorKnowledgeSource) {
        const sourceDoc = await this.config.VectorKnowledgeSource.findOne({ sourceId: source.sourceId });
        if (sourceDoc) {
          if (failed > 0) await sourceDoc.markPartialIngestion(created, `Failed: ${failed}`);
          else await sourceDoc.markIngested(created);
        }
      }

      if (failed > 0) this.stats.sourcesPartial++;
      else this.stats.sourcesIngested++;
      this.stats.chunksUpdated += updated;

      const elapsed = Date.now() - start;
      if (elapsed > this.stats.slowestSource.ms) this.stats.slowestSource = { sourceId: source.sourceId, ms: elapsed };

      return { sourceId: source.sourceId, status: failed > 0 ? 'PARTIAL' : 'SUCCESS', chunksCreated: created, chunksSkipped: skipped, chunksFailed: failed };
    } catch (error) {
      this.stats.sourcesError++;
      this.stats.errors.push(`[${source.sourceId}] ${error.message}`);
      return { sourceId: source.sourceId, status: 'ERROR', error: error.message };
    }
  }

  async ingestAll() {
    const allStart = Date.now();
    logger.info('Starting ingestion...');
    logger.info(`Configuration: dryRun=${this.config.dryRun}, maxChunks=${this.config.maxChunks}`);

    try {
      const { sources, errors } = loadSourceRegistry();
      if (errors.length) this.stats.errors.push(...errors);
      let selected = this.filterSources(sources || []);
      logger.info(`Loaded ${sources.length} sources from registry`);
      logger.info(`Selected ${selected.length} sources after filters`);
      if (!selected.length) {
        return { status: 'ERROR', message: 'No sources selected for ingestion', totalSources: 0, stats: this.stats, results: [] };
      }

      const providerMeta = {
        provider: this.config.embeddingClient?.config?.provider || process.env.EMBEDDING_PROVIDER || 'none',
        model: this.config.embeddingClient?.provider?.model || process.env.EMBEDDING_MODEL || null,
        dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || 0, 10) || null,
      };

      const results = [];
      for (let i = 0; i < selected.length; i++) {
        if (this.totalProcessedChunks >= this.config.maxChunks) {
          logger.warn('Max chunks reached, stopping ingestion');
          break;
        }
        const r = await this.ingestSource(selected[i], i, selected.length, providerMeta);
        results.push(r);
      }

      this.stats.totalTimeMs = Date.now() - allStart;
      return {
        status: this.stats.sourcesError > 0 ? 'PARTIAL' : 'SUCCESS',
        totalSources: selected.length,
        stats: { ...this.stats, cacheStats: this.cache.getStats() },
        results,
      };
    } catch (error) {
      return { status: 'ERROR', message: error.message, totalSources: 0, stats: this.stats, results: [] };
    }
  }

  static printSummary(summary) {
    logger.info('\n========== INGESTION SUMMARY ==========');
    logger.info(`Status: ${summary.status}`);
    logger.info(`Total Sources Processed: ${summary.stats.sourcesProcessed}`);
    logger.info(`Sources Skipped: ${summary.stats.sourcesSkipped}`);
    logger.info(`Sources Failed: ${summary.stats.sourcesError}`);
    logger.info(`Chunks Created: ${summary.stats.chunksCreated}`);
    logger.info(`Chunks Updated: ${summary.stats.chunksUpdated}`);
    logger.info(`Chunks Skipped Unchanged: ${summary.stats.chunksSkipped}`);
    logger.info(`Chunks Failed Embedding: ${summary.stats.embeddingsFailed}`);
    logger.info(`Total Time: ${summary.stats.totalTimeMs}ms`);
    logger.info(`Slowest Source: ${summary.stats.slowestSource.sourceId || '-'} (${summary.stats.slowestSource.ms}ms)`);
    logger.info(`Slowest Chunk Embedding: ${summary.stats.slowestEmbedding.chunkId || '-'} (${summary.stats.slowestEmbedding.ms}ms)`);
    logger.info('========================================\n');
  }
}

module.exports = IngestionService;
