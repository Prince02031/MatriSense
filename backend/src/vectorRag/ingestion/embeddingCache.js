/**
 * Embedding Cache for Vector RAG
 * Tracks embeddings in memory to avoid duplicate API calls
 * Also checks database for already-embedded content
 */

const { generateContentHash } = require('../core/hashContent');

/**
 * In-memory cache for embeddings
 */
class EmbeddingCache {
  constructor() {
    // Map of textHash -> { chunkId, embedding, timestamp }
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      saved: 0, // Cost saved (API calls avoided)
    };
  }

  /**
   * Set embedding in cache
   * @param {string} textHash - SHA256 hash of text
   * @param {string} chunkId - Chunk ID
   * @param {array} embedding - Embedding vector
   */
  set(textHash, chunkId, embedding) {
    this.cache.set(textHash, {
      chunkId,
      embedding,
      timestamp: Date.now(),
    });
  }

  /**
   * Get embedding from cache
   * @param {string} textHash - SHA256 hash of text
   * @returns {object|null} Cached embedding or null
   */
  get(textHash) {
    const cached = this.cache.get(textHash);
    if (cached) {
      this.stats.hits++;
      return cached;
    }
    this.stats.misses++;
    return null;
  }

  /**
   * Check if hash is in cache
   * @param {string} textHash - SHA256 hash of text
   * @returns {boolean}
   */
  has(textHash) {
    return this.cache.has(textHash);
  }

  /**
   * Record cost saved (API call avoided)
   * @param {number} callsAvoided - Number of API calls avoided
   */
  recordSaved(callsAvoided = 1) {
    this.stats.saved += callsAvoided;
  }

  /**
   * Get cache statistics
   * @returns {object} Stats object
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)).toFixed(2)
        : 'N/A',
    };
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, saved: 0 };
  }

  /**
   * Get estimated cost saved
   * @param {number} costPerEmbedding - Cost per embedding call in USD
   * @returns {number} Estimated cost saved
   */
  getEstimatedCostSaved(costPerEmbedding = 0.00001) {
    return (this.stats.saved * costPerEmbedding).toFixed(6);
  }
}

/**
 * Database-backed embedding checker
 * Checks if content already exists in MongoDB
 */
class DatabaseEmbeddingChecker {
  constructor(VectorKnowledgeChunk) {
    this.VectorKnowledgeChunk = VectorKnowledgeChunk;
    this.stats = {
      checked: 0,
      found: 0,
    };
  }

  /**
   * Check if text hash exists in database
   * @param {string} textHash - SHA256 hash of text
   * @returns {Promise<object|null>} Existing chunk or null
   */
  async checkByHash(textHash) {
    try {
      // In dry-run or if model not available, skip database check
      if (!this.VectorKnowledgeChunk) {
        return null;
      }
      this.stats.checked++;
      const existing = await this.VectorKnowledgeChunk.findOne({ textHash });
      if (existing) {
        this.stats.found++;
        return existing;
      }
      return null;
    } catch (error) {
      console.warn('Database check failed:', error.message);
      return null;
    }
  }

  /**
   * Check if chunk exists by ID
   * @param {string} chunkId - Chunk ID
   * @returns {Promise<object|null>} Existing chunk or null
   */
  async checkById(chunkId) {
    try {
      // In dry-run or if model not available, skip database check
      if (!this.VectorKnowledgeChunk) {
        return null;
      }
      return await this.VectorKnowledgeChunk.findOne({ chunkId });
    } catch (error) {
      console.warn('Database check failed:', error.message);
      return null;
    }
  }

  /**
   * Get statistics
   * @returns {object} Stats object
   */
  getStats() {
    return {
      ...this.stats,
      duplicateRate: this.stats.checked > 0
        ? ((this.stats.found / this.stats.checked) * 100).toFixed(2) + '%'
        : 'N/A',
    };
  }
}

module.exports = {
  EmbeddingCache,
  DatabaseEmbeddingChecker,
};
