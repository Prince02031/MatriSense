/**
 * Guidance Type Policy
 * Restricts which guidance types are allowed for different audiences
 * Ensures patient-safe content and proper escalation pathways
 */

// Guidance types available in system
const GUIDANCE_TYPES = {
  // Patient-safe
  URGENT_ESCALATION: { level: 'ESCALATION', audience: 'PATIENT' },
  CONTACT_HEALTH_WORKER: { level: 'ESCALATION', audience: 'PATIENT' },
  SELF_CARE_AND_MONITOR: { level: 'GUIDANCE', audience: 'PATIENT' },
  WARNING_SIGNS: { level: 'INFORMATION', audience: 'PATIENT' },
  SAFETY_DISCLAIMER: { level: 'SAFETY', audience: 'PATIENT' },
  FOLLOW_UP_QUESTION: { level: 'QUESTION', audience: 'PATIENT' },

  // Health worker guidance
  HEALTH_WORKER_REVIEW: { level: 'REVIEW', audience: 'HEALTH_WORKER' },
  REFERRAL_WORKFLOW: { level: 'WORKFLOW', audience: 'HEALTH_WORKER' },
  FACILITY_READINESS: { level: 'FACILITY', audience: 'HEALTH_WORKER' },

  // Documentation/admin only
  SYSTEM_CONTEXT: { level: 'CONTEXT', audience: 'ADMIN' },
  DIGITAL_HEALTH_ARCHITECTURE: { level: 'ARCHITECTURE', audience: 'ADMIN' },
};

// Guidance types allowed per audience
const AUDIENCE_GUIDANCE_POLICY = {
  PATIENT: [
    'URGENT_ESCALATION',
    'CONTACT_HEALTH_WORKER',
    'SELF_CARE_AND_MONITOR',
    'WARNING_SIGNS',
    'SAFETY_DISCLAIMER',
    'FOLLOW_UP_QUESTION',
  ],
  HEALTH_WORKER: [
    'URGENT_ESCALATION',
    'CONTACT_HEALTH_WORKER',
    'SELF_CARE_AND_MONITOR',
    'WARNING_SIGNS',
    'SAFETY_DISCLAIMER',
    'FOLLOW_UP_QUESTION',
    'HEALTH_WORKER_REVIEW',
    'REFERRAL_WORKFLOW',
    'FACILITY_READINESS',
  ],
  ADMIN: [
    'SYSTEM_CONTEXT',
    'DIGITAL_HEALTH_ARCHITECTURE',
  ],
  DOCS: [
    'SYSTEM_CONTEXT',
    'DIGITAL_HEALTH_ARCHITECTURE',
  ],
};

/**
 * Check if guidance type is allowed for audience
 * @param {string} guidanceType - Guidance type to check
 * @param {string} audience - Target audience (PATIENT, HEALTH_WORKER, ADMIN, DOCS)
 * @returns {boolean} true if allowed
 */
function isGuidanceTypeAllowedForAudience(guidanceType, audience) {
  const allowed = AUDIENCE_GUIDANCE_POLICY[audience] || [];
  return allowed.includes(guidanceType);
}

/**
 * Filter guidance types for audience
 * Returns only guidance types that are safe for the audience
 * @param {array} guidanceTypes - Array of guidance types
 * @param {string} audience - Target audience
 * @returns {array} Filtered guidance types
 */
function filterGuidanceTypesForAudience(guidanceTypes, audience) {
  if (!Array.isArray(guidanceTypes)) return [];
  return guidanceTypes.filter((gt) =>
    isGuidanceTypeAllowedForAudience(gt, audience)
  );
}

/**
 * Get available guidance types for audience
 * @param {string} audience - Target audience
 * @returns {array} Array of allowed guidance types
 */
function getAvailableGuidanceTypesForAudience(audience) {
  return AUDIENCE_GUIDANCE_POLICY[audience] || [];
}

/**
 * Check if any of the chunk's guidance types are allowed for audience
 * @param {array} chunkGuidanceTypes - Chunk's allowed guidance types
 * @param {string} audience - Target audience
 * @returns {boolean} true if at least one guidance type is allowed
 */
function hasAllowedGuidanceTypeForAudience(chunkGuidanceTypes, audience) {
  if (!Array.isArray(chunkGuidanceTypes)) return false;
  return chunkGuidanceTypes.some((gt) =>
    isGuidanceTypeAllowedForAudience(gt, audience)
  );
}

/**
 * Get guidance type level (for prioritization)
 * @param {string} guidanceType - Guidance type
 * @returns {string|null} Level or null
 */
function getGuidanceTypeLevel(guidanceType) {
  const info = GUIDANCE_TYPES[guidanceType];
  return info ? info.level : null;
}

/**
 * Check if guidance type indicates escalation
 * @param {string} guidanceType - Guidance type
 * @returns {boolean} true if escalation type
 */
function isEscalationGuidanceType(guidanceType) {
  return ['URGENT_ESCALATION', 'CONTACT_HEALTH_WORKER'].includes(guidanceType);
}

/**
 * Check if guidance type is patient-safe
 * @param {string} guidanceType - Guidance type
 * @returns {boolean} true if patient-safe
 */
function isPatientSafeGuidanceType(guidanceType) {
  return AUDIENCE_GUIDANCE_POLICY.PATIENT.includes(guidanceType);
}

/**
 * Recommend guidance types for risk level
 * @param {string} riskLevel - Risk level (LOW, MEDIUM, HIGH)
 * @param {string} audience - Target audience
 * @returns {array} Recommended guidance types
 */
function recommendGuidanceTypesForRiskLevel(riskLevel, audience = 'PATIENT') {
  const allowed = AUDIENCE_GUIDANCE_POLICY[audience] || [];

  if (riskLevel === 'HIGH') {
    return allowed.filter((gt) =>
      ['URGENT_ESCALATION', 'CONTACT_HEALTH_WORKER', 'WARNING_SIGNS'].includes(gt)
    );
  }

  if (riskLevel === 'MEDIUM') {
    return allowed.filter((gt) =>
      ['CONTACT_HEALTH_WORKER', 'SELF_CARE_AND_MONITOR', 'WARNING_SIGNS'].includes(gt)
    );
  }

  // LOW risk
  return allowed.filter((gt) =>
    ['SELF_CARE_AND_MONITOR', 'WARNING_SIGNS', 'FOLLOW_UP_QUESTION'].includes(gt)
  );
}

/**
 * Get policy summary for logging
 * @returns {object} Policy summary
 */
function getPolicySummary() {
  return {
    totalGuidanceTypes: Object.keys(GUIDANCE_TYPES).length,
    audiences: Object.keys(AUDIENCE_GUIDANCE_POLICY),
    patientSafe: AUDIENCE_GUIDANCE_POLICY.PATIENT.length,
    workerSafe: AUDIENCE_GUIDANCE_POLICY.HEALTH_WORKER.length,
    adminOnly: AUDIENCE_GUIDANCE_POLICY.ADMIN.length,
  };
}

module.exports = {
  GUIDANCE_TYPES,
  AUDIENCE_GUIDANCE_POLICY,
  isGuidanceTypeAllowedForAudience,
  filterGuidanceTypesForAudience,
  getAvailableGuidanceTypesForAudience,
  hasAllowedGuidanceTypeForAudience,
  getGuidanceTypeLevel,
  isEscalationGuidanceType,
  isPatientSafeGuidanceType,
  recommendGuidanceTypesForRiskLevel,
  getPolicySummary,
};
