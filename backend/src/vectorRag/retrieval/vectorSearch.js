/**
 * Vector Search
 * MongoDB vector search with metadata filtering
 */

/**
 * Build MongoDB vector search pipeline
 * @param {object} config - Search configuration
 * @param {array} config.embedding - Query embedding vector
 * @param {number} config.topK - Number of results to return
 * @param {object} config.filters - Optional metadata filters
 * @param {number} config.minScore - Minimum similarity score (0-1, default 0.0)
 * @returns {array} MongoDB aggregation pipeline
 */
function buildVectorSearchPipeline(config) {
  const { embedding, topK = 10, filters = {}, minScore = 0.0 } = config;

  if (!embedding || !Array.isArray(embedding)) {
    throw new Error('embedding vector required');
  }

  const pipeline = [
    {
      $search: {
        cosmosSearch: {
          vector: embedding,
          k: topK * 2, // Get more to account for filtering
        },
        returnScore: true,
        select: ['text', 'metadata', 'chunkId', 'sourceId', 'textHash'],
      },
    },
    {
      $project: {
        similarityScore: { $meta: 'searchScore' },
        text: 1,
        metadata: 1,
        chunkId: 1,
        sourceId: 1,
        textHash: 1,
      },
    },
  ];

  // Apply filters if provided
  if (Object.keys(filters).length > 0) {
    const filterCondition = buildFilterCondition(filters);
    pipeline.push({
      $match: filterCondition,
    });
  }

  // Filter by minimum score
  if (minScore > 0) {
    pipeline.push({
      $match: {
        similarityScore: { $gte: minScore },
      },
    });
  }

  // Limit results
  pipeline.push({
    $limit: topK,
  });

  return pipeline;
}

/**
 * Build MongoDB match condition from filters
 * @param {object} filters - Filter object
 * @returns {object} MongoDB match condition
 */
function buildFilterCondition(filters) {
  const conditions = [];

  if (filters.sourceId) {
    conditions.push({ sourceId: filters.sourceId });
  }

  if (filters.sourceKind) {
    conditions.push({ 'metadata.sourceKind': filters.sourceKind });
  }

  if (filters.audience) {
    conditions.push({
      'metadata.allowedAudiences': { $in: [filters.audience] },
    });
  }

  if (filters.riskLevel) {
    if (Array.isArray(filters.riskLevel)) {
      conditions.push({
        'metadata.riskLevel': { $in: filters.riskLevel },
      });
    } else {
      conditions.push({
        'metadata.riskLevel': filters.riskLevel,
      });
    }
  }

  if (filters.evidenceTags && Array.isArray(filters.evidenceTags)) {
    conditions.push({
      'metadata.evidenceTags': { $in: filters.evidenceTags },
    });
  }

  if (filters.symptoms && Array.isArray(filters.symptoms)) {
    conditions.push({
      'metadata.symptoms': { $in: filters.symptoms },
    });
  }

  if (filters.trusted !== undefined) {
    conditions.push({
      'metadata.trusted': filters.trusted,
    });
  }

  if (filters.language) {
    conditions.push({
      'metadata.language': filters.language,
    });
  }

  if (filters.textHashExclude) {
    // Exclude specific text hashes (for deduplication)
    conditions.push({
      textHash: { $nin: filters.textHashExclude },
    });
  }

  // Combine conditions with $and
  if (conditions.length === 0) {
    return {};
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return { $and: conditions };
}

/**
 * Execute vector search
 * @param {object} VectorKnowledgeChunk - Mongoose model
 * @param {array} embedding - Query embedding vector
 * @param {object} options - Search options
 * @returns {Promise<array>} Retrieved chunks
 */
async function vectorSearch(VectorKnowledgeChunk, embedding, options = {}) {
  if (!VectorKnowledgeChunk) {
    throw new Error('VectorKnowledgeChunk model required');
  }

  const {
    topK = 10,
    filters = {},
    minScore = 0.0,
  } = options;

  const pipeline = buildVectorSearchPipeline({
    embedding,
    topK,
    filters,
    minScore,
  });

  try {
    const results = await VectorKnowledgeChunk.aggregate(pipeline);
    return results;
  } catch (error) {
    throw new Error(`Vector search failed: ${error.message}`);
  }
}

/**
 * Search by text hash (for deduplication)
 * @param {object} VectorKnowledgeChunk - Mongoose model
 * @param {string} textHash - Text hash to search for
 * @returns {Promise<object|null>} Matching chunk or null
 */
async function searchByTextHash(VectorKnowledgeChunk, textHash) {
  if (!VectorKnowledgeChunk) {
    throw new Error('VectorKnowledgeChunk model required');
  }

  try {
    return await VectorKnowledgeChunk.findOne({ textHash });
  } catch (error) {
    throw new Error(`Text hash search failed: ${error.message}`);
  }
}

/**
 * Search by chunk ID
 * @param {object} VectorKnowledgeChunk - Mongoose model
 * @param {string} chunkId - Chunk ID to search for
 * @returns {Promise<object|null>} Matching chunk or null
 */
async function searchByChunkId(VectorKnowledgeChunk, chunkId) {
  if (!VectorKnowledgeChunk) {
    throw new Error('VectorKnowledgeChunk model required');
  }

  try {
    return await VectorKnowledgeChunk.findOne({ chunkId });
  } catch (error) {
    throw new Error(`Chunk ID search failed: ${error.message}`);
  }
}

/**
 * Search by source ID
 * @param {object} VectorKnowledgeChunk - Mongoose model
 * @param {string} sourceId - Source ID to search for
 * @param {object} options - Search options
 * @returns {Promise<array>} Matching chunks
 */
async function searchBySourceId(VectorKnowledgeChunk, sourceId, options = {}) {
  if (!VectorKnowledgeChunk) {
    throw new Error('VectorKnowledgeChunk model required');
  }

  const { limit = 100, skip = 0 } = options;

  try {
    return await VectorKnowledgeChunk.find({ sourceId })
      .skip(skip)
      .limit(limit);
  } catch (error) {
    throw new Error(`Source ID search failed: ${error.message}`);
  }
}

module.exports = {
  buildVectorSearchPipeline,
  buildFilterCondition,
  vectorSearch,
  searchByTextHash,
  searchByChunkId,
  searchBySourceId,
};
