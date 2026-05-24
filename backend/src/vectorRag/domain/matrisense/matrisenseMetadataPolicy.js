/**
 * MatriSense Metadata Enrichment Policy
 * Merges registry metadata, adapter metadata, and enriches with symptoms/evidence
 */

const { extractKeywordsFromText, getConditionMetadata } = require('./maternalKeywordMap');

/**
 * Merge registry and adapter metadata
 * Registry metadata provides source-level restrictions
 * Adapter metadata provides chunk-specific information
 * @param {object} registryEntry - Source registry entry
 * @param {object} adapterMetadata - Metadata from adapter
 * @returns {object} Merged metadata
 */
function mergeRegistryAndAdapterMetadata(registryEntry, adapterMetadata) {
  if (!registryEntry || !adapterMetadata) {
    return adapterMetadata || registryEntry?.defaultMetadata || {};
  }

  // Start with adapter metadata
  const merged = { ...adapterMetadata };

  // Preserve source-level restrictions from registry
  if (registryEntry.defaultMetadata) {
    const { defaultMetadata } = registryEntry;

    // Keep restrictive flags
    if (defaultMetadata.restrictedPatientContext !== undefined) {
      merged.restrictedPatientContext = defaultMetadata.restrictedPatientContext;
    }
    if (defaultMetadata.patientRestricted !== undefined) {
      merged.patientRestricted = defaultMetadata.patientRestricted;
    }

    // Keep source flags
    if (defaultMetadata.trusted !== undefined) {
      merged.trusted = defaultMetadata.trusted;
    }
    if (defaultMetadata.fallback !== undefined) {
      merged.fallback = defaultMetadata.fallback;
    }
  }

  // Keep registry audience restrictions
  merged.allowedAudiences = registryEntry.audiences || ['PATIENT', 'HEALTH_WORKER'];
  merged.allowedGuidanceTypes = registryEntry.allowedGuidanceTypes || [];

  return merged;
}

/**
 * Enrich metadata with symptom/evidence detection
 * Scans chunk text for maternal health keywords
 * @param {object} metadata - Chunk metadata
 * @param {string} chunkText - Chunk text content
 * @returns {object} Enriched metadata
 */
function enrichMetadataWithSymptoms(metadata, chunkText) {
  const enriched = { ...metadata };

  // Extract keywords from chunk text
  const detectedConditions = extractKeywordsFromText(chunkText);

  if (detectedConditions.length > 0) {
    // Collect evidence tags and symptoms
    const evidenceTags = new Set(enriched.evidenceTags || []);
    const symptoms = new Set(enriched.symptoms || []);
    let maxRiskLevel = enriched.riskLevel || 'LOW';

    for (const conditionKey of detectedConditions) {
      const conditionMeta = getConditionMetadata(conditionKey);
      if (conditionMeta) {
        symptoms.add(conditionKey);

        // Add evidence tags
        if (conditionMeta.evidenceTags) {
          conditionMeta.evidenceTags.forEach((tag) => evidenceTags.add(tag));
        }

        // Update risk level if higher
        const riskLevels = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        if (
          (riskLevels[conditionMeta.riskLevel] || 0) >
          (riskLevels[maxRiskLevel] || 0)
        ) {
          maxRiskLevel = conditionMeta.riskLevel;
        }
      }
    }

    enriched.symptoms = Array.from(symptoms);
    enriched.evidenceTags = Array.from(evidenceTags);
    enriched.detectedRiskLevel = maxRiskLevel;
  }

  return enriched;
}

/**
 * Enforce patient-safety restrictions on metadata
 * Worker/docs-only sources cannot be presented as patient chunks
 * @param {object} metadata - Chunk metadata
 * @param {string} audience - Target audience (PATIENT, HEALTH_WORKER, ADMIN, DOCS)
 * @returns {boolean} true if chunk is allowed for audience
 */
function isMetadataAllowedForAudience(metadata, audience) {
  if (!metadata) return false;

  // Check restrictive flags
  if (metadata.patientRestricted && audience === 'PATIENT') {
    return false;
  }
  if (metadata.restrictedPatientContext && audience === 'PATIENT') {
    return false;
  }

  // Check allowed audiences
  if (metadata.allowedAudiences && !metadata.allowedAudiences.includes(audience)) {
    return false;
  }

  return true;
}

/**
 * Validate chunk metadata quality
 * Ensures required fields exist
 * @param {object} metadata - Chunk metadata
 * @returns {object} { valid: boolean, issues: array }
 */
function validateMetadata(metadata) {
  const issues = [];

  if (!metadata.sourceId) issues.push('Missing sourceId');
  if (!metadata.sourceKind) issues.push('Missing sourceKind');
  if (!metadata.language) issues.push('Missing language');

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Get metadata summary for logging/debugging
 * @param {object} metadata - Chunk metadata
 * @returns {object} Summary object
 */
function getMetadataSummary(metadata) {
  return {
    sourceId: metadata.sourceId,
    sourceKind: metadata.sourceKind,
    riskLevel: metadata.riskLevel || 'UNSET',
    detectedRiskLevel: metadata.detectedRiskLevel || 'UNSET',
    symptoms: metadata.symptoms ? metadata.symptoms.length : 0,
    evidenceTags: metadata.evidenceTags ? metadata.evidenceTags.length : 0,
    allowedAudiences: metadata.allowedAudiences || [],
    trusted: metadata.trusted || false,
    restricted: metadata.patientRestricted || metadata.restrictedPatientContext || false,
  };
}

module.exports = {
  mergeRegistryAndAdapterMetadata,
  enrichMetadataWithSymptoms,
  isMetadataAllowedForAudience,
  validateMetadata,
  getMetadataSummary,
};
