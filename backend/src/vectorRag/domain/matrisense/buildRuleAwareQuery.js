/**
 * Build Rule-Aware Query
 * Constructs embedding query from decision context, symptoms, and evidence
 * Does not rely solely on raw patient text
 */

const { extractKeywordsFromText } = require('./maternalKeywordMap');
const { getAvailableGuidanceTypesForAudience } = require('./guidanceTypePolicy');

/**
 * Build query from decision context
 * Combines:
 * - Risk level from decision
 * - Evidence tags from matched rules
 * - Allowed guidance types
 * - Confirmed symptoms from case state
 * - Symptom keywords from patient input
 *
 * @param {object} config - Query building config
 * @param {object} config.decision - Decision output from rule engine
 *   - decision.riskLevel: 'LOW'|'MEDIUM'|'HIGH'
 *   - decision.evidenceTags: array of tag strings
 *   - decision.allowedGuidanceType: guidance type or array
 *   - decision.matchedRuleName: rule name that matched
 * @param {object} config.caseState - Current case state
 *   - caseState.symptoms: array of confirmed symptom codes
 *   - caseState.confirmedSymptoms: object mapping symptom to value
 * @param {string} config.patientInput - Raw patient text (optional)
 * @param {string} config.audience - Target audience (PATIENT, HEALTH_WORKER, ADMIN)
 * @param {number} config.topK - Number of results to retrieve (default 10)
 * @returns {object} Query config for retrieval
 *   - queryText: string to embed
 *   - riskLevel: from decision
 *   - evidenceTags: preferred tags
 *   - allowedGuidanceTypes: for filtering
 *   - targetAudience: audience
 *   - topK: number of results
 *   - confidence: confidence in query (0-1)
 *   - components: { riskLevel, evidenceTags, guidanceTypes, symptoms }
 */
function buildRuleAwareQuery(config) {
  const {
    decision,
    caseState,
    patientInput,
    audience = 'PATIENT',
    topK = 10,
  } = config;

  if (!decision) {
    throw new Error('buildRuleAwareQuery: decision required');
  }

  // Extract components
  const riskLevel = decision.riskLevel || 'MEDIUM';
  const evidenceTags = decision.evidenceTags || [];
  let allowedGuidanceTypes = decision.allowedGuidanceType || [];
  if (!Array.isArray(allowedGuidanceTypes)) {
    allowedGuidanceTypes = [allowedGuidanceTypes];
  }

  // Extract confirmed symptoms
  const confirmedSymptoms = extractConfirmedSymptoms(caseState);

  const rawInput = extractRawInputText({ patientInput, caseState, decision });

  // Extract symptoms from raw input if provided
  const patientSymptoms = rawInput
    ? extractKeywordsFromText(rawInput)
    : [];

  // Build query text components
  const queryComponents = [];

  // Risk level context
  queryComponents.push(buildRiskLevelContext(riskLevel));

  // Evidence tags context
  if (evidenceTags.length > 0) {
    queryComponents.push(`Evidence: ${evidenceTags.join(', ')}`);
  }

  // Symptoms context (confirmed are weighted higher)
  if (confirmedSymptoms.length > 0) {
    queryComponents.push(`Symptoms: ${confirmedSymptoms.join(', ')}`);
  }

  if (patientSymptoms.length > 0 && patientSymptoms[0] !== confirmedSymptoms[0]) {
    // Add patient-detected symptoms if different from confirmed
    queryComponents.push(`Additional findings: ${patientSymptoms.join(', ')}`);
  }

  // Raw patient context (Bangla or mixed language) for semantic retrieval only
  if (rawInput) {
    queryComponents.push(`Patient raw input: ${rawInput}`);
  }

  // Rule context if available
  if (decision.matchedRuleName) {
    queryComponents.push(`Context: ${decision.matchedRuleName}`);
  }
  if (Array.isArray(decision.matchedRules) && decision.matchedRules.length > 0) {
    queryComponents.push(`Matched rules: ${decision.matchedRules.join(', ')}`);
  }

  // Guidance type context
  const recommendedGuidanceTypes = getAvailableGuidanceTypesForAudience(
    audience
  );
  if (recommendedGuidanceTypes.length > 0) {
    queryComponents.push(
      `Guidance for ${audience}: ${recommendedGuidanceTypes.slice(0, 3).join(', ')}`
    );
  }

  // Combine components into query text
  const queryText = queryComponents.filter((c) => c).join(' | ');

  // Calculate confidence (higher with more evidence)
  let confidence = 0.5; // Base confidence
  if (evidenceTags.length > 0) confidence += 0.15;
  if (confirmedSymptoms.length > 0) confidence += 0.2;
  if (decision.matchedRuleName) confidence += 0.15;
  confidence = Math.min(confidence, 1.0);

  return {
    queryText,
    riskLevel,
    evidenceTags,
    allowedGuidanceTypes,
    targetAudience: audience,
    topK,
    confidence,
    components: {
      riskLevel,
      evidenceTags,
      guidanceTypes: allowedGuidanceTypes,
      confirmedSymptoms,
      patientSymptoms,
      rawInputIncluded: !!rawInput,
      rawInput,
      matchedRule: decision.matchedRuleName,
      matchedRules: Array.isArray(decision.matchedRules) ? decision.matchedRules : [],
    },
  };
}

function extractRawInputText({ patientInput, caseState, decision }) {
  const candidates = [
    patientInput,
    caseState?.rawInput,
    caseState?.rawSymptomText,
    caseState?.symptomText,
    caseState?.originalInput,
    caseState?.originalInputBn,
    caseState?.userInput,
    caseState?.banglaInput,
    caseState?.meta?.rawInput,
    caseState?.meta?.rawSymptomText,
    caseState?.meta?.originalInput,
    caseState?.meta?.originalInputBn,
    caseState?.session?.rawInput,
    decision?.session?.rawInput,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) return c.trim();
  }
  return '';
}

/**
 * Build risk level context string
 * @param {string} riskLevel - Risk level
 * @returns {string} Context string
 */
function buildRiskLevelContext(riskLevel) {
  const contextMap = {
    HIGH: 'Urgent escalation needed. Danger signs present.',
    MEDIUM: 'Needs health worker assessment. Monitoring required.',
    LOW: 'Monitor and provide guidance. Safe at home.',
  };
  return contextMap[riskLevel] || 'Health assessment context';
}

/**
 * Extract confirmed symptoms from case state
 * @param {object} caseState - Case state object
 * @returns {array} Array of symptom codes
 */
function extractConfirmedSymptoms(caseState) {
  if (!caseState) return [];

  const symptoms = [];

  // From symptoms array
  if (Array.isArray(caseState.symptoms)) {
    symptoms.push(...caseState.symptoms);
  }

  // From confirmedSymptoms object (keys are symptom codes)
  if (caseState.confirmedSymptoms && typeof caseState.confirmedSymptoms === 'object') {
    const confirmedKeys = Object.keys(caseState.confirmedSymptoms).filter(
      (key) => caseState.confirmedSymptoms[key] === true || caseState.confirmedSymptoms[key] === 'yes'
    );
    symptoms.push(...confirmedKeys);
  }

  // Deduplicate
  return [...new Set(symptoms)];
}

/**
 * Validate query config
 * @param {object} queryConfig - Query config to validate
 * @returns {object} { valid: boolean, issues: array }
 */
function validateQueryConfig(queryConfig) {
  const issues = [];

  if (!queryConfig.queryText || queryConfig.queryText.trim().length === 0) {
    issues.push('queryText is empty');
  }

  if (!queryConfig.riskLevel) {
    issues.push('riskLevel not set');
  }

  if (!queryConfig.targetAudience) {
    issues.push('targetAudience not set');
  }

  if (!queryConfig.topK || queryConfig.topK < 1) {
    issues.push('topK must be >= 1');
  }

  if (queryConfig.confidence < 0 || queryConfig.confidence > 1) {
    issues.push('confidence must be between 0 and 1');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Get query summary for logging
 * @param {object} queryConfig - Query config
 * @returns {object} Summary object
 */
function getQuerySummary(queryConfig) {
  return {
    textLength: queryConfig.queryText.length,
    riskLevel: queryConfig.riskLevel,
    audience: queryConfig.targetAudience,
    topK: queryConfig.topK,
    confidence: queryConfig.confidence.toFixed(2),
    evidenceTagCount: queryConfig.evidenceTags.length,
    symptomCount: queryConfig.components.confirmedSymptoms.length,
    rawInputIncluded: !!queryConfig.components.rawInputIncluded,
  };
}

module.exports = {
  buildRuleAwareQuery,
  buildRiskLevelContext,
  extractConfirmedSymptoms,
  validateQueryConfig,
  getQuerySummary,
};
