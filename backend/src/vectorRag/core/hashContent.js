/**
 * Stable content hashing for Vector RAG
 * Used to detect duplicate chunks and avoid re-embedding identical content
 */

const crypto = require('crypto');

/**
 * Generate stable hash for text content
 * @param {string} text - The text to hash
 * @returns {string} SHA256 hash in hex format
 */
function hashText(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }
  return crypto.createHash('sha256').update(text.trim()).digest('hex');
}

/**
 * Generate stable hash for metadata object
 * @param {object} metadata - The metadata to hash
 * @returns {string} SHA256 hash in hex format
 */
function hashMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }
  // Sort keys for consistent ordering
  const sorted = Object.keys(metadata)
    .sort()
    .reduce((acc, key) => {
      acc[key] = metadata[key];
      return acc;
    }, {});
  
  const jsonStr = JSON.stringify(sorted);
  return crypto.createHash('sha256').update(jsonStr).digest('hex');
}

/**
 * Generate combined hash for text + metadata
 * Used to detect duplicate chunks with same content and context
 * @param {string} text - The chunk text
 * @param {object} metadata - The metadata object (sourceId, pageStart, sectionTitle, etc.)
 * @returns {object} { textHash, metadataHash, combinedHash }
 */
function generateContentHash(text, metadata = {}) {
  const textHash = hashText(text);
  const metadataHash = hashMetadata(metadata);
  
  // Combined hash includes both text and metadata
  const combined = `${textHash}:${metadataHash}`;
  const combinedHash = crypto.createHash('sha256').update(combined).digest('hex');
  
  return {
    textHash,
    metadataHash,
    combinedHash,
  };
}

/**
 * Quick check: is this hash already in database?
 * Useful before embedding to avoid duplicate work
 * @param {string} contentHash - The combined hash
 * @param {object} db - Database reference (used by calling code)
 * @returns {boolean} true if hash exists in DB
 */
function isDuplicateHash(contentHash, db) {
  // This is a marker function for caller to implement
  // Returns true if the hash exists in VectorKnowledgeChunk collection
  // Actual implementation is in the ingestion service
  if (!contentHash || !db) {
    return false;
  }
  return false; // Caller must implement actual DB check
}

module.exports = {
  hashText,
  hashMetadata,
  generateContentHash,
  isDuplicateHash,
};
