/**
 * Rule-Aware Vector Retriever
 * Main orchestrator for rule-aware vector retrieval
 * Handles embedding, search, filtering, and safety checks
 */

const { buildRuleAwareQuery, validateQueryConfig, getQuerySummary } = require('../domain/matrisense/buildRuleAwareQuery');
const { filterChunksThroughGuards } = require('../domain/matrisense/retrievalGuards');
const { vectorSearch } = require('./vectorSearch');

/**
 * Retrieve chunks using rule-aware vector search
 *
 * @param {object} config - Retrieval configuration
 * @param {object} config.decision - Decision from rule engine
 * @param {object} config.caseState - Current case state
 * @param {string} config.patientInput - Raw patient input (optional)
 * @param {string} config.audience - Target audience (default PATIENT)
 * @param {number} config.topK - Results to retrieve (default 10)
 * @param {object} config.embeddingClient - EmbeddingClient instance
 * @param {object} config.VectorKnowledgeChunk - Mongoose model
 * @param {boolean} config.dryRun - Skip actual retrieval (default false)
 *
 * @returns {Promise<object>} Retrieval result
 *   - ok: boolean, success status
 *   - mode: 'rule-aware' | 'fallback' | 'error'
 *   - queryText: embedded query text
 *   - queryConfig: full query configuration
 *   - filtersApplied: metadata filters used
 *   - retrievedChunks: array of accepted chunks with scores
 *   - rejectedChunks: array of rejected chunks with reasons
 *   - totalRetrieved: count of accepted chunks
 *   - totalRejected: count of rejected chunks
 *   - warnings: array of warning messages
 *   - fallbackRecommended: boolean, recommend fallback
 *   - error: error message if ok=false
 */
async function retrieveRuleAware(config) {
  const {
    decision,
    caseState,
    patientInput,
    audience = 'PATIENT',
    topK = 10,
    embeddingClient,
    VectorKnowledgeChunk,
    dryRun = false,
  } = config;

  const result = {
    ok: false,
    mode: 'rule-aware',
    queryText: '',
    queryConfig: null,
    filtersApplied: {},
    retrievedChunks: [],
    rejectedChunks: [],
    totalRetrieved: 0,
    totalRejected: 0,
    warnings: [],
    fallbackRecommended: false,
    error: null,
  };

  try {
    // Step 1: Validate inputs
    if (!decision) {
      result.error = 'Decision required for rule-aware retrieval';
      return result;
    }

    // Step 2: Build rule-aware query
    let queryConfig;
    try {
      queryConfig = buildRuleAwareQuery({
        decision,
        caseState,
        patientInput,
        audience,
        topK,
      });
    } catch (error) {
      result.error = `Query building failed: ${error.message}`;
      return result;
    }

    // Validate query
    const queryValidation = validateQueryConfig(queryConfig);
    if (!queryValidation.valid) {
      result.error = `Query validation failed: ${queryValidation.issues.join('; ')}`;
      return result;
    }

    result.queryText = queryConfig.queryText;
    result.queryConfig = queryConfig;
    result.rawInputIncluded = !!queryConfig.components?.rawInputIncluded;

    // Step 3: Embed query
    if (!embeddingClient) {
      result.error = 'EmbeddingClient required';
      return result;
    }

    let embedding;
    let embeddingError = false;

    try {
      const embedResult = await embeddingClient.embed(queryConfig.queryText, {
        inputType: 'query',
      });

      if (!embedResult.ok) {
        embeddingError = true;

        if (embedResult.error === 'QUOTA_EXHAUSTED') {
          result.warnings.push('Gemini API quota exhausted');
          result.fallbackRecommended = true;
        } else if (embedResult.error === 'RATE_LIMITED') {
          result.warnings.push('Gemini API rate limited');
          result.fallbackRecommended = true;
        } else {
          result.warnings.push(`Embedding error: ${embedResult.error}`);
          result.fallbackRecommended = true;
        }

        result.ok = false;
        result.error = `Embedding failed: ${embedResult.error}`;
        return result;
      }

      embedding = embedResult.embedding;
    } catch (error) {
      result.error = `Embedding error: ${error.message}`;
      result.fallbackRecommended = true;
      return result;
    }

    if (!embedding || !Array.isArray(embedding)) {
      result.error = 'Invalid embedding vector returned';
      return result;
    }

    // Step 4: Build filters
    const filters = buildMetadataFilters(queryConfig, audience);
    result.filtersApplied = filters;

    // Step 5: Vector search
    if (dryRun) {
      result.ok = true;
      result.totalRetrieved = 0;
      result.warnings.push('DRY RUN: No actual retrieval performed');
      return result;
    }

    if (!VectorKnowledgeChunk) {
      result.error = 'VectorKnowledgeChunk model required';
      return result;
    }

    let retrievedRaw;
    try {
      retrievedRaw = await vectorSearch(VectorKnowledgeChunk, embedding, {
        topK: queryConfig.topK,
        filters,
        minScore: 0.0,
      });
    } catch (error) {
      result.error = `Vector search failed: ${error.message}`;
      result.fallbackRecommended = true;
      return result;
    }

    if (!Array.isArray(retrievedRaw)) {
      result.error = 'Invalid search results';
      return result;
    }

    // Step 6: Apply retrieval guards
    const { accepted, rejected } = filterChunksThroughGuards(retrievedRaw, queryConfig);

    result.retrievedChunks = accepted;
    result.rejectedChunks = rejected;
    result.totalRetrieved = accepted.length;
    result.totalRejected = rejected.length;

    // Step 7: Check if results are acceptable
    if (accepted.length === 0) {
      result.warnings.push('No chunks passed retrieval guards');
      result.fallbackRecommended = true;
    }

    result.ok = true;
    return result;
  } catch (error) {
    result.error = `Unexpected error: ${error.message}`;
    result.fallbackRecommended = true;
    return result;
  }
}

/**
 * Build metadata filters from query config
 * @param {object} queryConfig - Query configuration
 * @param {string} audience - Target audience
 * @returns {object} MongoDB filters
 */
function buildMetadataFilters(queryConfig, audience) {
  const filters = {};

  // Audience filter
  filters.audience = audience;

  // Risk level filter
  if (queryConfig.riskLevel) {
    const queryRisk = String(queryConfig.riskLevel).toUpperCase();
    if (queryRisk === 'HIGH') {
      filters.riskLevel = ['HIGH', 'ALL'];
    } else if (queryRisk === 'MEDIUM') {
      filters.riskLevel = ['MEDIUM', 'HIGH', 'ALL'];
    } else {
      filters.riskLevel = ['LOW', 'MEDIUM', 'HIGH', 'ALL'];
    }
  }

  // Do not hard-filter on evidence/symptoms in DB query.
  // Relevance is checked by retrieval guards to avoid over-pruning.

  return filters;
}

/**
 * Get retrieval summary for logging
 * @param {object} retrievalResult - Result from retrieveRuleAware
 * @returns {object} Summary object
 */
function getRetrievalSummary(retrievalResult) {
  return {
    ok: retrievalResult.ok,
    mode: retrievalResult.mode,
    queryLength: retrievalResult.queryText.length,
    accepted: retrievalResult.totalRetrieved,
    rejected: retrievalResult.totalRejected,
    fallbackRecommended: retrievalResult.fallbackRecommended,
    warnings: retrievalResult.warnings.length,
    error: retrievalResult.error ? 'yes' : 'no',
  };
}

module.exports = {
  retrieveRuleAware,
  buildMetadataFilters,
  getRetrievalSummary,
};
