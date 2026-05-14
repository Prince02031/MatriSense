const { SYMPTOM_CODES } = require('../../triage/data/symptomCodes');

/**
 * Validator for the Symptom Extractor LLM Output
 */

const VALID_DURATIONS = [
  'unknown',
  'less_than_1_hour',
  '1_6_hours',
  '6_hours_plus',
  'more_than_1_day'
];

const validateExtractorOutput = (output) => {
  const issues = [];

  if (!output || typeof output !== 'object') {
    return { valid: false, issues: ['Output is not a valid object'], data: null };
  }

  // 1. detectedSymptoms
  if (!Array.isArray(output.detectedSymptoms)) {
    issues.push('detectedSymptoms must be an array');
  } else {
    output.detectedSymptoms.forEach((s, idx) => {
      if (!SYMPTOM_CODES.includes(s)) {
        issues.push(`Invalid symptom code: "${s}" at index ${idx}`);
      }
    });
  }

  // 2. severity
  if (!output.severity || typeof output.severity !== 'object') {
    issues.push('severity must be an object');
  }

  // 3. duration
  if (!VALID_DURATIONS.includes(output.duration)) {
    issues.push(`Invalid duration: "${output.duration}". Must be one of: ${VALID_DURATIONS.join(', ')}`);
  }

  // 4. uncertainFields
  if (!Array.isArray(output.uncertainFields)) {
    issues.push('uncertainFields must be an array');
  }

  // 5. needsFollowUp
  if (typeof output.needsFollowUp !== 'boolean') {
    issues.push('needsFollowUp must be a boolean');
  }

  return {
    valid: issues.length === 0,
    issues,
    data: issues.length === 0 ? output : null
  };
};

module.exports = {
  validateExtractorOutput,
  VALID_DURATIONS
};
