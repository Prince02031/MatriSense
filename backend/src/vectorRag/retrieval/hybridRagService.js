/**
 * Hybrid RAG Service
 * Manages RAG_MODE and routes retrieval appropriately
 * Ensures JSON RAG remains primary fallback
 */

const { retrieveEvidenceHybrid } = require('../../rag/hybridEvidenceRetriever');
const EmbeddingClient = require('../core/embeddingClient');
const VectorKnowledgeChunk = require('../models/VectorKnowledgeChunk');
const { retrieveRuleAware } = require('./ruleAwareVectorRetriever');

/**
 * Get RAG mode from environment
 * Defaults to 'hybrid'
 */
function getRagMode() {
  const mode = (process.env.RAG_MODE || 'hybrid').toLowerCase();
  const validModes = ['json', 'hybrid', 'vector'];
  
  if (!validModes.includes(mode)) {
    console.warn(`Invalid RAG_MODE: ${mode}, defaulting to 'hybrid'`);
    return 'hybrid';
  }
  
  return mode;
}

/**
 * Retrieve evidence with appropriate RAG mode
 * Handles all three modes: json, hybrid, vector
 *
 * @param {object} config - Retrieval configuration
 * @returns {Promise<object>} Evidence retrieval result
 */
async function retrieveEvidenceWithMode(config = {}) {
  const requestedMode = config.ragMode ? String(config.ragMode).toLowerCase() : null;
  const ragMode = ['json', 'hybrid', 'vector'].includes(requestedMode)
    ? requestedMode
    : getRagMode();
  
  // Merge mode from config if provided
  const retrievalConfig = {
    ...config,
    ragMode,
    vectorRetriever: retrieveRuleAware,
    embeddingClient: new EmbeddingClient(),
    VectorKnowledgeChunk,
  };

  // Delegate to hybrid retriever (handles all modes)
  try {
    const result = await retrieveEvidenceHybrid(retrievalConfig);
    
    // Ensure we always have retrieved cards for safety
    if (!result.retrievedCards || result.retrievedCards.length === 0) {
      result.retrievalWarnings.push('No evidence retrieved, using safety fallback');
    }

    return result;
  } catch (error) {
    console.error('[HybridRagService] Retrieval error:', error.message);
    
    // Fall back to JSON-only retrieval
    const { retrieveEvidence } = require('../../rag/evidenceRetriever');
    try {
      const jsonResult = retrieveEvidence({
        decision: config.decision,
        caseState: config.caseState,
        knowledgeCards: config.knowledgeCards,
      });

      return {
        ...jsonResult,
        ragMode: 'json-emergency-fallback',
        vectorAttempted: true,
        vectorSkippedReason: 'hybrid_service_error',
        vectorFallbackUsed: true,
        retrievalWarnings: [`Critical error in RAG: ${error.message}. Fell back to JSON.`],
      };
    } catch (fallbackError) {
      console.error('[HybridRagService] Fallback retrieval failed:', fallbackError.message);
      throw fallbackError;
    }
  }
}

/**
 * Get RAG status/capabilities for monitoring
 */
function getRagStatus() {
  const ragMode = getRagMode();
  const provider = (process.env.EMBEDDING_PROVIDER || 'local').toLowerCase();
  const vectorEnabled =
    !!process.env.MONGODB_URI &&
    (provider !== 'gemini' || !!process.env.GOOGLE_API_KEY || !!process.env.GEMINI_API_KEY);
  
  return {
    ragMode,
    jsonRagAvailable: true,
    vectorRagAvailable: vectorEnabled === true,
    currentMode: ragMode,
    modesAvailable: vectorEnabled ? ['json', 'hybrid', 'vector'] : ['json'],
    fallbackMode: 'json',
  };
}

/**
 * Validate RAG configuration
 * Checks if required dependencies are available for selected mode
 */
function validateRagConfig() {
  const ragMode = getRagMode();
  const issues = [];

  if (ragMode === 'json') {
    // JSON mode only requires knowledge cards
    return { valid: true, issues: [] };
  }

  if (ragMode === 'hybrid' || ragMode === 'vector') {
    // Vector modes require additional setup
    if (!process.env.MONGODB_URI) {
      issues.push('MONGODB_URI not configured (required for vector RAG)');
    }
    const provider = (process.env.EMBEDDING_PROVIDER || 'local').toLowerCase();
    if (provider === 'gemini' && !process.env.GOOGLE_API_KEY && !process.env.GEMINI_API_KEY) {
      issues.push('GOOGLE_API_KEY/GEMINI_API_KEY not configured (required for gemini embeddings)');
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    recommendedMode: issues.length === 0 ? ragMode : 'json',
  };
}

module.exports = {
  retrieveEvidenceWithMode,
  getRagMode,
  getRagStatus,
  validateRagConfig,
};
