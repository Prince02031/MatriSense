/**
 * Source Registry Loader for Vector RAG
 * Loads and validates sourceRegistry.json
 */

const fs = require('fs');
const path = require('path');

/**
 * Load source registry from file
 * @param {string} registryPath - Path to sourceRegistry.json (optional, uses default)
 * @returns {object} { sources, metadata, errors }
 */
function loadSourceRegistry(registryPath = null) {
  try {
    // Default to backend/src/vectorRag/ingestion/sourceRegistry.json
    const defaultPath = path.join(
      __dirname,
      '..',
      'ingestion',
      'sourceRegistry.json'
    );
    
    const filePath = registryPath || defaultPath;

    if (!fs.existsSync(filePath)) {
      return {
        sources: [],
        metadata: null,
        errors: [`Source registry not found at ${filePath}`],
      };
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const registry = JSON.parse(content);

    // Validate registry structure
    const errors = [];
    const sources = [];

    if (!Array.isArray(registry.sources)) {
      return {
        sources: [],
        metadata: registry.metadata || null,
        errors: ['Registry does not contain sources array'],
      };
    }

    // Validate each source entry
    for (let i = 0; i < registry.sources.length; i++) {
      const source = registry.sources[i];
      const sourceErrors = validateSourceEntry(source, i);

      if (sourceErrors.length > 0) {
        errors.push(...sourceErrors);
      } else {
        sources.push(source);
      }
    }

    return {
      sources,
      metadata: registry.metadata || null,
      errors,
    };
  } catch (error) {
    return {
      sources: [],
      metadata: null,
      errors: [`Failed to load source registry: ${error.message}`],
    };
  }
}

/**
 * Validate a single source entry
 * @param {object} source - Source entry to validate
 * @param {number} index - Index in array (for error reporting)
 * @returns {array} Array of error messages
 */
function validateSourceEntry(source, index) {
  const errors = [];

  // Required fields
  const requiredFields = [
    'sourceId',
    'sourceKind',
    'path',
    'title',
  ];

  for (const field of requiredFields) {
    if (!source[field]) {
      errors.push(`Source[${index}]: Missing required field '${field}'`);
    }
  }

  // Validate sourceKind
  const validKinds = ['KNOWLEDGE_CARD', 'MARKDOWN', 'PDF', 'HTML'];
  if (source.sourceKind && !validKinds.includes(source.sourceKind)) {
    errors.push(
      `Source[${index}] (${source.sourceId}): Invalid sourceKind '${source.sourceKind}'. Must be one of: ${validKinds.join(', ')}`
    );
  }

  // Validate language
  if (source.language && !Array.isArray(source.language)) {
    errors.push(
      `Source[${index}] (${source.sourceId}): language must be an array`
    );
  }

  // Validate audiences
  const validAudiences = ['PATIENT', 'HEALTH_WORKER', 'ADMIN', 'DOCS'];
  if (source.audiences && Array.isArray(source.audiences)) {
    for (const aud of source.audiences) {
      if (!validAudiences.includes(aud)) {
        errors.push(
          `Source[${index}] (${source.sourceId}): Invalid audience '${aud}'`
        );
      }
    }
  }

  // Validate guidance types
  const validGuidanceTypes = [
    'URGENT_ESCALATION',
    'CONTACT_HEALTH_WORKER',
    'SELF_CARE_AND_MONITOR',
    'WARNING_SIGNS',
    'SAFETY_DISCLAIMER',
    'FOLLOW_UP_QUESTION',
    'HEALTH_WORKER_REVIEW',
    'REFERRAL_WORKFLOW',
    'FACILITY_READINESS',
    'SYSTEM_CONTEXT',
    'DIGITAL_HEALTH_ARCHITECTURE',
  ];
  if (source.allowedGuidanceTypes && Array.isArray(source.allowedGuidanceTypes)) {
    for (const gt of source.allowedGuidanceTypes) {
      if (!validGuidanceTypes.includes(gt)) {
        errors.push(
          `Source[${index}] (${source.sourceId}): Invalid guidanceType '${gt}'`
        );
      }
    }
  }

  return errors;
}

/**
 * Get source by ID
 * @param {array} sources - Array of loaded sources
 * @param {string} sourceId - Source ID to find
 * @returns {object|null} Source entry or null if not found
 */
function getSourceById(sources, sourceId) {
  if (!Array.isArray(sources)) {
    return null;
  }
  return sources.find((s) => s.sourceId === sourceId) || null;
}

/**
 * Filter sources by audience
 * @param {array} sources - Array of sources
 * @param {string} audience - Audience to filter by (PATIENT, HEALTH_WORKER, ADMIN, DOCS)
 * @returns {array} Filtered sources
 */
function filterByAudience(sources, audience) {
  if (!Array.isArray(sources) || !audience) {
    return [];
  }
  return sources.filter((s) => {
    if (!s.audiences || !Array.isArray(s.audiences)) {
      return false;
    }
    return s.audiences.includes(audience);
  });
}

/**
 * Filter sources by guidance type
 * @param {array} sources - Array of sources
 * @param {string} guidanceType - Guidance type to filter by
 * @returns {array} Filtered sources
 */
function filterByGuidanceType(sources, guidanceType) {
  if (!Array.isArray(sources) || !guidanceType) {
    return [];
  }
  return sources.filter((s) => {
    if (!s.allowedGuidanceTypes || !Array.isArray(s.allowedGuidanceTypes)) {
      return false;
    }
    return s.allowedGuidanceTypes.includes(guidanceType);
  });
}

/**
 * Get patient-safe sources (those approved for patient guidance)
 * @param {array} sources - Array of sources
 * @returns {array} Patient-safe sources
 */
function getPatientSafeSources(sources) {
  return filterByAudience(sources, 'PATIENT').filter((s) => {
    // Additional safety check: source must not be restricted
    return s.restrictedPatientContext !== true;
  });
}

/**
 * Sort sources by priority (lower number = higher priority)
 * @param {array} sources - Array of sources
 * @returns {array} Sorted sources
 */
function sortByPriority(sources) {
  if (!Array.isArray(sources)) {
    return [];
  }
  return [...sources].sort((a, b) => {
    const aPriority = a.priority || 999;
    const bPriority = b.priority || 999;
    return aPriority - bPriority;
  });
}

module.exports = {
  loadSourceRegistry,
  validateSourceEntry,
  getSourceById,
  filterByAudience,
  filterByGuidanceType,
  getPatientSafeSources,
  sortByPriority,
};
