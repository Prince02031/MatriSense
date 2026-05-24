/**
 * Hybrid Evidence Retriever
 * Integrates Vector RAG as optional supplementary retrieval layer
 * Preserves JSON card RAG as primary with mandatory fallback
 *
 * RAG_MODE behavior:
 * - 'json': JSON card RAG only (default, fallback)
 * - 'hybrid': JSON cards + safe vector chunks
 * - 'vector': Vector first with JSON fallback
 */

const { retrieveEvidence: retrieveJsonCards } = require('./evidenceRetriever');

/**
 * Retrieve evidence with optional hybrid vector retrieval
 *
 * @param {object} config
 * @param {object} config.decision - Decision from rule engine
 * @param {object} config.caseState - Current case state
 * @param {array} config.knowledgeCards - JSON knowledge cards
 * @param {object} config.vectorRetriever - ruleAwareVectorRetriever (optional)
 * @param {object} config.embeddingClient - EmbeddingClient (optional)
 * @param {object} config.VectorKnowledgeChunk - Mongoose model (optional)
 * @param {string} config.ragMode - 'json' | 'hybrid' | 'vector' (default: 'json')
 * @param {boolean} config.dryRun - Skip actual retrieval
 *
 * @returns {Promise<object>} Combined retrieval result
 *   - retrievedCards: array of unique cards (JSON + vector)
 *   - blockedAdvice: array of blocked advice items
 *   - ragMode: mode used ('json', 'hybrid', 'vector', or 'json-fallback')
 *   - vectorChunks: array of vector chunks (if hybrid/vector mode)
 *   - vectorFallbackUsed: boolean (true if vector failed and fell back to JSON)
 *   - retrievalWarnings: array of warning messages
 *   - sourceMetadata: metadata about sources used
 */
async function retrieveEvidenceHybrid(config = {}) {
  const {
    decision,
    caseState,
    knowledgeCards = [],
    vectorRetriever,
    embeddingClient,
    VectorKnowledgeChunk,
    ragMode = 'json',
    dryRun = false,
  } = config;

  const result = {
    retrievedCards: [],
    blockedAdvice: [],
    ragMode: 'json',
    vectorChunks: [],
    vectorFallbackUsed: false,
    retrievalWarnings: [],
    vectorAttempted: false,
    vectorSkippedReason: null,
    vectorQueryText: null,
    filtersApplied: null,
    rejectedChunksCount: 0,
    rejectedChunksPreview: [],
    embeddingProvider: process.env.EMBEDDING_PROVIDER || 'local',
    embeddingModel: process.env.EMBEDDING_MODEL || null,
    vectorIndexName: process.env.VECTOR_INDEX_NAME || 'vector_index',
    vectorCollectionName: 'vectorKnowledgeChunks',
    sourceMetadata: {
      jsonCardsCount: 0,
      vectorChunksCount: 0,
      mergedCount: 0,
    },
  };

  try {
    // Step 1: Always retrieve JSON cards (primary source)
    const jsonResult = retrieveJsonCards({ decision, caseState, knowledgeCards });
    result.retrievedCards = jsonResult.retrievedCards || [];
    result.blockedAdvice = jsonResult.blockedAdvice || [];
    result.sourceMetadata.jsonCardsCount = result.retrievedCards.length;

    // Step 2: Determine if vector retrieval should be attempted
    const shouldTryVector = (ragMode === 'hybrid' || ragMode === 'vector')
      && vectorRetriever
      && embeddingClient
      && VectorKnowledgeChunk;

    if (!shouldTryVector) {
      result.ragMode = 'json';
      if (ragMode === 'json') {
        result.vectorSkippedReason = 'RAG_MODE=json';
      } else if (!vectorRetriever) {
        result.vectorSkippedReason = 'hybrid retriever not wired';
      } else if (!embeddingClient) {
        result.vectorSkippedReason = 'embedding client not available';
      } else if (!VectorKnowledgeChunk) {
        result.vectorSkippedReason = 'vector model not available';
      } else {
        result.vectorSkippedReason = 'vector prerequisites missing';
      }
      return result;
    }

    // Step 3: Attempt vector retrieval
    let vectorResult = null;
    result.vectorAttempted = true;
    try {
      if (typeof vectorRetriever === 'function') {
        vectorResult = await vectorRetriever({
          decision,
          caseState,
          audience: 'PATIENT',
          topK: 5,
          embeddingClient,
          VectorKnowledgeChunk,
          dryRun,
        });
      } else {
        vectorResult = await vectorRetriever.retrieve(
          {
            decision,
            caseState,
            embeddingClient,
            VectorKnowledgeChunk,
          },
          {
            audience: 'PATIENT',
            decisionContext: decision,
            maxResults: 5,
            dryRun,
          }
        );
      }
    } catch (vectorError) {
      result.vectorFallbackUsed = true;
      result.vectorSkippedReason = 'vector_retrieval_exception';
      result.retrievalWarnings.push(`Vector retrieval error: ${vectorError.message}`);
    }

    // Step 4: Handle vector retrieval results
    if (!vectorResult || !vectorResult.ok) {
      // Vector failed - use JSON fallback
      result.vectorFallbackUsed = true;
      result.ragMode = ragMode === 'vector' ? 'json-fallback' : 'json';
      
      if (vectorResult?.error) {
        result.vectorSkippedReason = vectorResult.error === 'Embedding failed'
          ? 'embedding_failed'
          : 'atlas_vector_search_failed';
        result.retrievalWarnings.push(`Vector retrieval failed: ${vectorResult.error}`);
      }
      
      if (vectorResult?.warnings) {
        result.retrievalWarnings.push(...vectorResult.warnings);
      }

      if (vectorResult?.fallbackRecommended) {
        result.retrievalWarnings.push('Vector provider fallback recommended (quota/rate-limit)');
      }

      result.vectorQueryText = vectorResult?.queryText || null;
      result.filtersApplied = vectorResult?.filtersApplied || null;
      result.rejectedChunksCount = vectorResult?.totalRejected || 0;
      result.rejectedChunksPreview = Array.isArray(vectorResult?.rejectedChunks)
        ? vectorResult.rejectedChunks.slice(0, 5)
        : [];

      return result;
    }

    // Step 5: Process vector chunks (convert to card-like format for merging)
    const vectorChunks = vectorResult.retrievedChunks || [];
    const convertedChunks = convertVectorChunksToCards(vectorChunks, decision);
    result.vectorChunks = convertedChunks;
    result.sourceMetadata.vectorChunksCount = convertedChunks.length;
    result.vectorQueryText = vectorResult.queryText || null;
    result.filtersApplied = vectorResult.filtersApplied || null;
    result.rejectedChunksCount = vectorResult.totalRejected || 0;
    result.rejectedChunksPreview = Array.isArray(vectorResult.rejectedChunks)
      ? vectorResult.rejectedChunks.slice(0, 5)
      : [];
    if (convertedChunks.length === 0) {
      result.vectorSkippedReason = 'no_chunks_passed_guards';
    }

    // Step 6: Merge results based on mode
    if (ragMode === 'hybrid') {
      // Hybrid mode: JSON primary + vector supplementary
      result.retrievedCards = mergeCardsWithVector(
        result.retrievedCards,
        convertedChunks,
        decision
      );
      result.ragMode = 'hybrid';
    } else if (ragMode === 'vector') {
      // Vector mode: Vector primary + JSON fallback (already have JSON as fallback)
      result.retrievedCards = mergeCardsWithVector(
        convertedChunks,
        result.retrievedCards,
        decision,
        true // vector_first
      );
      result.ragMode = 'vector';
    }

    result.sourceMetadata.mergedCount = result.retrievedCards.length;
    
    // Add vector retrieval info to warnings
    if (vectorResult.warnings && vectorResult.warnings.length > 0) {
      result.retrievalWarnings.push(...vectorResult.warnings);
    }

    return result;
  } catch (error) {
    result.ragMode = 'json-fallback';
    result.vectorFallbackUsed = true;
    result.retrievalWarnings.push(`Hybrid retrieval error: ${error.message}`);
    result.vectorSkippedReason = 'hybrid_pipeline_error';
    // Return JSON cards only (already populated)
    return result;
  }
}

/**
 * Convert vector chunks to card-like format for merging
 * Marks chunks as from vector source to avoid override of JSON guidance
 */
function convertVectorChunksToCards(chunks, decision) {
  if (!Array.isArray(chunks)) return [];

  return chunks.map((chunk, idx) => ({
    id: `vector_${chunk.sourceId}_${idx}`,
    sourceId: chunk.sourceId,
    sourceKind: chunk.sourceKind || 'VECTOR_RAG',
    evidenceTag: (Array.isArray(chunk.evidenceTags) && chunk.evidenceTags[0]) || 'vector_chunk',
    text: chunk.text || '',
    textSummary: (chunk.text || '').substring(0, 150),
    guidanceType:
      (Array.isArray(chunk.guidanceTypes) && chunk.guidanceTypes[0]) || 'SUPPORTIVE_ACTION',
    riskLevelAllowed: [decision.riskLevel],
    symptoms: chunk.symptoms || [],
    priority: Math.round((chunk.score || 0) * 100),
    messageRole: 'SUPPORTIVE_ACTION', // Vector chunks are supplementary
    stepsBn: chunk.text ? [chunk.text.substring(0, 240)] : [],
    monitorBn: [],
    escalationTriggersBn: [],
    sourceName: chunk.sourceTitle || chunk.sourceId || 'Vector RAG',
    citation: chunk.sourceTitle || chunk.sourceId || 'Vector RAG',
    isVectorChunk: true,
    vectorScore: chunk.score,
    vectorMetadata: {
      sourceId: chunk.sourceId,
      textHash: chunk.textHash,
      retrievalConfidence: chunk.score,
    },
  }));
}

/**
 * Merge JSON cards with vector chunks
 * Deduplicates and maintains priority hierarchy
 */
function mergeCardsWithVector(
  primaryCards,
  vectorCards,
  decision,
  vectorFirst = false
) {
  if (!Array.isArray(primaryCards)) primaryCards = [];
  if (!Array.isArray(vectorCards)) vectorCards = [];

  const merged = [];
  const seenContent = new Set();

  // Add primary cards (JSON first by default, or vector if vectorFirst)
  const primaryToAdd = vectorFirst ? vectorCards : primaryCards;
  const secondaryToAdd = vectorFirst ? primaryCards : vectorCards;

  for (const card of primaryToAdd) {
    if (!card) continue;

    // Check for exact duplicates
    const contentHash = normalizeText(card.text || card.textSummary || '');
    if (contentHash && seenContent.has(contentHash)) continue;

    // For HIGH risk, ensure self-care only content is blocked
    if (decision.riskLevel === 'HIGH' && card.guidanceType === 'SELF_CARE_AND_MONITOR') {
      if (!normalizeArray(card.riskLevelAllowed).includes('HIGH')) {
        continue;
      }
    }

    // For vector chunks, validate they're not duplicating JSON guidance
    if (card.isVectorChunk && merged.length > 0) {
      const isDuplicate = merged.some(
        (existing) =>
          existing.guidanceType === card.guidanceType &&
          similarityScore(existing.text, card.text) > 0.8
      );
      if (isDuplicate) continue;
    }

    if (contentHash) seenContent.add(contentHash);
    merged.push(card);
  }

  // Add secondary cards (for supplementary guidance)
  for (const card of secondaryToAdd) {
    if (!card) continue;

    const contentHash = normalizeText(card.text || card.textSummary || '');
    if (contentHash && seenContent.has(contentHash)) continue;

    // Maintain guidance type restrictions
    if (decision.riskLevel === 'HIGH' && card.guidanceType === 'SELF_CARE_AND_MONITOR') {
      if (!normalizeArray(card.riskLevelAllowed).includes('HIGH')) {
        continue;
      }
    }

    if (contentHash) seenContent.add(contentHash);
    merged.push(card);
  }

  // Sort by priority (JSON cards by default, then by vector score)
  merged.sort((a, b) => {
    const aPri = a.priority || (a.isVectorChunk ? 0 : 50);
    const bPri = b.priority || (b.isVectorChunk ? 0 : 50);
    return bPri - aPri;
  });

  return merged;
}

/**
 * Normalize text for deduplication
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .substring(0, 100); // First 100 chars
}

/**
 * Simple similarity score (0-1) based on common words
 */
function similarityScore(text1, text2) {
  if (!text1 || !text2) return 0;

  const words1 = new Set(normalizeText(text1).split(' '));
  const words2 = new Set(normalizeText(text2).split(' '));

  const intersection = [...words1].filter((w) => words2.has(w)).length;
  const union = words1.size + words2.size - intersection;

  return union === 0 ? 0 : intersection / union;
}

/**
 * Utility to normalize arrays
 */
function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

module.exports = {
  retrieveEvidenceHybrid,
  convertVectorChunksToCards,
  mergeCardsWithVector,
};
