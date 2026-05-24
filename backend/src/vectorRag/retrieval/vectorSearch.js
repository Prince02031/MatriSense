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
  const {
    embedding,
    topK = 10,
    filters = {},
    minScore = 0.0,
    indexName = process.env.VECTOR_INDEX_NAME || 'vector_index',
  } = config;

  if (!embedding || !Array.isArray(embedding)) {
    throw new Error('embedding vector required');
  }

  const vectorFilter = buildFilterCondition(filters);

  const pipeline = [
    {
      $vectorSearch: {
        index: indexName,
        path: 'embedding',
        queryVector: embedding,
        numCandidates: Math.max(topK * 10, 100),
        limit: topK * 2,
        ...(Object.keys(vectorFilter).length > 0 ? { filter: vectorFilter } : {}),
      },
    },
    {
      $project: {
        similarityScore: { $meta: 'vectorSearchScore' },
        text: 1,
        chunkId: 1,
        sourceId: 1,
        sourceTitle: 1,
        sourceKind: 1,
        guidanceTypes: 1,
        audience: 1,
        riskLevelAllowed: 1,
        evidenceTags: 1,
        symptoms: 1,
        priority: 1,
        textHash: 1,
      },
    },
  ];

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
    conditions.push({ sourceKind: filters.sourceKind });
  }

  if (filters.audience) {
    conditions.push({
      audience: { $in: [filters.audience] },
    });
  }

  if (filters.riskLevel) {
    if (Array.isArray(filters.riskLevel)) {
      conditions.push({
        riskLevelAllowed: { $in: filters.riskLevel },
      });
    } else {
      conditions.push({
        riskLevelAllowed: filters.riskLevel,
      });
    }
  }

  if (filters.evidenceTags && Array.isArray(filters.evidenceTags)) {
    conditions.push({
      evidenceTags: { $in: filters.evidenceTags },
    });
  }

  if (filters.symptoms && Array.isArray(filters.symptoms)) {
    conditions.push({
      symptoms: { $in: filters.symptoms },
    });
  }

  if (filters.trusted !== undefined) {
    conditions.push({
      trusted: filters.trusted,
    });
  }

  if (filters.language) {
    conditions.push({
      language: filters.language,
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
    indexName = process.env.VECTOR_INDEX_NAME || 'vector_index',
  } = options;

  const pipeline = buildVectorSearchPipeline({
    embedding,
    topK,
    filters,
    minScore,
    indexName,
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
