/**
 * Retrieval Guards
 * Filters and safety checks for vector retrieval results
 * Ensures chunks are appropriate for the audience and decision context
 */

const { isMetadataAllowedForAudience } = require('./matrisenseMetadataPolicy');
const {
  isGuidanceTypeAllowedForAudience,
  isPatientSafeGuidanceType,
} = require('./guidanceTypePolicy');

// Patterns indicating clinical/treatment content unsafe for patient guidance
const UNSAFE_FOR_PATIENT_PATTERNS = [
  /\bdosage\b/i,
  /\bdose\b/i,
  /\bmedication\b/i,
  /\bdrug\b/i,
  /\btreatment\b/i,
  /\bprocedure\b/i,
  /\bsurgical\b/i,
  /\bintravenous\b/i,
  /\biv\b/i,
  /\binjection\b/i,
  /\btherapy\b/i,
  /\bcatheter\b/i,
  /\bintubat/i,
];

/**
 * Check if chunk contains unsafe clinical content for patient guidance
 * @param {string} chunkText - Chunk text to analyze
 * @returns {boolean} true if chunk contains unsafe content
 */
function hasUnsafePatientContent(chunkText) {
  if (!chunkText) return false;
  return UNSAFE_FOR_PATIENT_PATTERNS.some((pattern) => pattern.test(chunkText));
}

/**
 * Guard: Check risk level compatibility
 * HIGH risk must not return LOW-only SELF_CARE_AND_MONITOR chunks
 * @param {string} queryRiskLevel - Risk level from query
 * @param {string} chunkRiskLevel - Risk level allowed by chunk metadata
 * @param {array} chunkGuidanceTypes - Guidance types in chunk
 * @returns {boolean} true if acceptable
 */
function guardRiskLevelCompatibility(
  queryRiskLevel,
  chunkRiskLevel,
  chunkGuidanceTypes
) {
  // HIGH risk queries should not get only SELF_CARE_AND_MONITOR chunks
  if (queryRiskLevel === 'HIGH') {
    if (
      chunkGuidanceTypes &&
      chunkGuidanceTypes.length === 1 &&
      chunkGuidanceTypes[0] === 'SELF_CARE_AND_MONITOR'
    ) {
      // If chunk riskLevel says LOW/MEDIUM, reject for HIGH query
      if (chunkRiskLevel === 'LOW' || chunkRiskLevel === 'MEDIUM') {
        return false;
      }
    }
  }

  return true;
}

/**
 * Guard: Check audience compatibility
 * Patient guidance must reject worker/docs-only chunks
 * @param {object} chunkMetadata - Chunk metadata
 * @param {string} audience - Target audience
 * @returns {object} { allowed: boolean, reason: string }
 */
function guardAudienceCompatibility(chunkMetadata, audience) {
  if (!chunkMetadata) {
    return { allowed: false, reason: 'No metadata' };
  }

  // Check if metadata allows this audience
  if (!isMetadataAllowedForAudience(chunkMetadata, audience)) {
    return {
      allowed: false,
      reason: `Chunk restricted from audience ${audience}`,
    };
  }

  // Patient audience
  if (audience === 'PATIENT') {
    if (chunkMetadata.patientRestricted) {
      return { allowed: false, reason: 'Chunk marked patientRestricted' };
    }
    if (chunkMetadata.restrictedPatientContext) {
      return { allowed: false, reason: 'Chunk marked restrictedPatientContext' };
    }
  }

  return { allowed: true, reason: 'Audience compatible' };
}

/**
 * Guard: Check guidance type compatibility
 * Chunk's guidance types must have at least one allowed for audience
 * @param {array} chunkGuidanceTypes - Guidance types from chunk metadata
 * @param {string} audience - Target audience
 * @returns {object} { allowed: boolean, reason: string }
 */
function guardGuidanceTypeCompatibility(chunkGuidanceTypes, audience) {
  if (!Array.isArray(chunkGuidanceTypes) || chunkGuidanceTypes.length === 0) {
    return { allowed: true, reason: 'No guidance type restriction' };
  }

  // Check if any guidance type is allowed for this audience
  const hasAllowed = chunkGuidanceTypes.some((gt) =>
    isGuidanceTypeAllowedForAudience(gt, audience)
  );

  if (!hasAllowed) {
    return {
      allowed: false,
      reason: `No compatible guidance types for ${audience}. Chunk has: ${chunkGuidanceTypes.join(', ')}`,
    };
  }

  return { allowed: true, reason: 'Guidance type compatible' };
}

/**
 * Guard: Check for unsafe patient content
 * Treatment/procedure/dosage content unsafe for patient guidance
 * @param {object} chunk - Chunk with text
 * @param {string} audience - Target audience
 * @returns {object} { allowed: boolean, reason: string }
 */
function guardPatientSafetyContent(chunk, audience) {
  if (audience !== 'PATIENT') {
    return { allowed: true, reason: 'Not patient audience' };
  }

  if (hasUnsafePatientContent(chunk.text)) {
    return {
      allowed: false,
      reason: 'Chunk contains unsafe clinical content for patient guidance',
    };
  }

  return { allowed: true, reason: 'Content safe for patient' };
}

/**
 * Guard: Check evidence tag overlap
 * Prefer chunks with evidence tag overlap with query
 * Returns priority score
 * @param {array} chunkEvidenceTags - Chunk evidence tags
 * @param {array} queryEvidenceTags - Query evidence tags
 * @returns {number} Overlap score (0-1)
 */
function scoreEvidenceTagOverlap(chunkEvidenceTags, queryEvidenceTags) {
  if (!Array.isArray(chunkEvidenceTags) || chunkEvidenceTags.length === 0) {
    return 0;
  }
  if (!Array.isArray(queryEvidenceTags) || queryEvidenceTags.length === 0) {
    return 0;
  }

  const overlap = chunkEvidenceTags.filter((tag) => queryEvidenceTags.includes(tag))
    .length;
  return overlap / Math.max(chunkEvidenceTags.length, queryEvidenceTags.length);
}

/**
 * Guard: Check symptom overlap
 * Prefer chunks with symptom overlap with query
 * Returns priority score
 * @param {array} chunkSymptoms - Chunk symptoms
 * @param {array} querySymptoms - Query symptoms
 * @returns {number} Overlap score (0-1)
 */
function scoreSymptomOverlap(chunkSymptoms, querySymptoms) {
  if (!Array.isArray(chunkSymptoms) || chunkSymptoms.length === 0) {
    return 0;
  }
  if (!Array.isArray(querySymptoms) || querySymptoms.length === 0) {
    return 0;
  }

  const overlap = chunkSymptoms.filter((sym) => querySymptoms.includes(sym)).length;
  return overlap / Math.max(chunkSymptoms.length, querySymptoms.length);
}

/**
 * Guard: Check if chunk can pass without exact overlap
 * General WARNING_SIGNS and SAFETY_DISCLAIMER chunks may pass
 * @param {array} chunkGuidanceTypes - Chunk guidance types
 * @returns {boolean} true if generic guidance allowed
 */
function allowGenericGuidance(chunkGuidanceTypes) {
  if (!Array.isArray(chunkGuidanceTypes)) return false;
  return chunkGuidanceTypes.some((gt) =>
    ['WARNING_SIGNS', 'SAFETY_DISCLAIMER'].includes(gt)
  );
}

/**
 * Evaluate chunk against all guards
 * Returns detailed result with reasons for rejection
 *
 * @param {object} chunk - Retrieved chunk
 * @param {string} chunk.text - Chunk text
 * @param {object} chunk.metadata - Chunk metadata
 * @param {object} queryConfig - Query configuration
 * @param {string} queryConfig.riskLevel - Risk level from query
 * @param {string} queryConfig.targetAudience - Target audience
 * @param {array} queryConfig.evidenceTags - Query evidence tags
 * @param {array} queryConfig.components.confirmedSymptoms - Query symptoms
 * @returns {object} Evaluation result
 *   - allowed: boolean
 *   - score: 0-1 priority score for ranking
 *   - reasons: array of reason strings
 *   - issues: array of rejection issues if any
 */
function evaluateChunk(chunk, queryConfig) {
  if (!chunk || !chunk.metadata) {
    return {
      allowed: false,
      score: 0,
      reasons: [],
      issues: ['Missing chunk or metadata'],
    };
  }

  const { metadata, text } = chunk;
  const { riskLevel, targetAudience, evidenceTags, components } = queryConfig;
  const reasons = [];
  const issues = [];

  // Guard 1: Audience compatibility
  const audienceCheck = guardAudienceCompatibility(metadata, targetAudience);
  if (!audienceCheck.allowed) {
    issues.push(audienceCheck.reason);
  } else {
    reasons.push(audienceCheck.reason);
  }

  // Guard 2: Risk level compatibility
  if (
    !guardRiskLevelCompatibility(riskLevel, metadata.riskLevel, metadata.guidanceTypes)
  ) {
    issues.push('Risk level incompatible with query');
  } else {
    reasons.push('Risk level compatible');
  }

  // Guard 3: Guidance type compatibility
  const guidanceCheck = guardGuidanceTypeCompatibility(
    metadata.guidanceTypes || metadata.allowedGuidanceTypes,
    targetAudience
  );
  if (!guidanceCheck.allowed) {
    issues.push(guidanceCheck.reason);
  } else {
    reasons.push('Guidance type compatible');
  }

  // Guard 4: Patient safety content
  const safetyCheck = guardPatientSafetyContent(chunk, targetAudience);
  if (!safetyCheck.allowed) {
    issues.push(safetyCheck.reason);
  } else {
    reasons.push('Content is safe');
  }

  // Calculate priority score (0-1)
  let score = 0.5; // Base score

  // Add scores for overlaps
  const tagOverlap = scoreEvidenceTagOverlap(metadata.evidenceTags, evidenceTags);
  score += tagOverlap * 0.2;

  const symptomOverlap = scoreSymptomOverlap(
    metadata.symptoms,
    components.confirmedSymptoms
  );
  score += symptomOverlap * 0.2;

  // Boost for trusted sources
  if (metadata.trusted) {
    score += 0.1;
  }

  // Cap at 1.0
  score = Math.min(score, 1.0);

  // Determine final allowed status
  const allowed = issues.length === 0;

  return {
    allowed,
    score: allowed ? score : 0,
    reasons,
    issues,
  };
}

/**
 * Filter chunks through all guards
 * Returns separated accepted/rejected chunks
 * @param {array} chunks - Retrieved chunks
 * @param {object} queryConfig - Query configuration
 * @returns {object} { accepted: array, rejected: array }
 */
function filterChunksThroughGuards(chunks, queryConfig) {
  if (!Array.isArray(chunks)) {
    return { accepted: [], rejected: [] };
  }

  const accepted = [];
  const rejected = [];

  for (const chunk of chunks) {
    const evaluation = evaluateChunk(chunk, queryConfig);
    if (evaluation.allowed) {
      accepted.push({
        chunk,
        ...evaluation,
      });
    } else {
      rejected.push({
        chunk,
        ...evaluation,
      });
    }
  }

  // Sort accepted by score (highest first)
  accepted.sort((a, b) => b.score - a.score);

  return { accepted, rejected };
}

module.exports = {
  hasUnsafePatientContent,
  guardRiskLevelCompatibility,
  guardAudienceCompatibility,
  guardGuidanceTypeCompatibility,
  guardPatientSafetyContent,
  scoreEvidenceTagOverlap,
  scoreSymptomOverlap,
  allowGenericGuidance,
  evaluateChunk,
  filterChunksThroughGuards,
};
