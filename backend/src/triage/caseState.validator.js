const ALLOWED_TRIMESTERS = new Set(['first', 'second', 'third', 'unknown']);
const ALLOWED_SEVERITY = new Set(['mild', 'moderate', 'severe', 'unknown']);
const ALLOWED_DURATION = new Set(['under_1h', '1_6h', 'over_6h', 'days', 'unknown']);
const ALLOWED_LOCALES = new Set(['bn', 'en']);

const isIsoDate = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));

const normalizeCaseState = (input = {}) => ({
  caseId: String(input.caseId || ''),
  patientId: String(input.patientId || ''),
  createdAt: input.createdAt || new Date().toISOString(),
  originalInputBn: input.originalInputBn,
  profile: {
    age: input.profile?.age,
    trimester: input.profile?.trimester || 'unknown',
    gestationalWeek: input.profile?.gestationalWeek ?? null,
    expectedDeliveryDate: input.profile?.expectedDeliveryDate ?? null,
    lastCheckupDate: input.profile?.lastCheckupDate ?? null,
    lastCheckupGapDays: input.profile?.lastCheckupGapDays ?? null,
    riskFactors: {
      hypertension: Boolean(input.profile?.riskFactors?.hypertension),
      diabetes: Boolean(input.profile?.riskFactors?.diabetes),
      anemia: Boolean(input.profile?.riskFactors?.anemia),
      previousHighRiskPregnancy: Boolean(input.profile?.riskFactors?.previousHighRiskPregnancy),
      previousCSection: Boolean(input.profile?.riskFactors?.previousCSection),
      previousMiscarriage: Boolean(input.profile?.riskFactors?.previousMiscarriage),
    },
  },
  symptoms: Array.isArray(input.symptoms) ? input.symptoms.map(String) : [],
  severity: input.severity || {},
  duration: input.duration || {},
  dangerSignsChecked: Array.isArray(input.dangerSignsChecked)
    ? input.dangerSignsChecked.map(String)
    : [],
  followUpAnswers: input.followUpAnswers || {},
  history: {
    previousTriageIds: Array.isArray(input.history?.previousTriageIds)
      ? input.history.previousTriageIds.map(String)
      : [],
    previousRiskLevels: Array.isArray(input.history?.previousRiskLevels)
      ? input.history.previousRiskLevels.map(String)
      : [],
    previousHighRiskCount: Number(input.history?.previousHighRiskCount || 0),
  },
  meta: {
    locale: input.meta?.locale || 'bn',
    sourceRefs: Array.isArray(input.meta?.sourceRefs) ? input.meta.sourceRefs.map(String) : [],
  },
});

const validateCaseState = (input = {}) => {
  const errors = [];
  const value = normalizeCaseState(input);

  if (!value.caseId) errors.push('caseId is required');
  if (!value.patientId) errors.push('patientId is required');
  if (!isIsoDate(value.createdAt)) errors.push('createdAt must be ISO date string');

  if (!ALLOWED_TRIMESTERS.has(value.profile.trimester)) {
    errors.push('profile.trimester is invalid');
  }

  if (value.profile.expectedDeliveryDate && !isIsoDate(value.profile.expectedDeliveryDate)) {
    errors.push('profile.expectedDeliveryDate must be ISO date string');
  }

  if (value.profile.lastCheckupDate && !isIsoDate(value.profile.lastCheckupDate)) {
    errors.push('profile.lastCheckupDate must be ISO date string');
  }

  Object.values(value.severity).forEach((severity) => {
    if (!ALLOWED_SEVERITY.has(String(severity))) {
      errors.push('severity contains invalid values');
    }
  });

  Object.values(value.duration).forEach((duration) => {
    if (!ALLOWED_DURATION.has(String(duration))) {
      errors.push('duration contains invalid values');
    }
  });

  if (!ALLOWED_LOCALES.has(value.meta.locale)) {
    errors.push('meta.locale must be bn or en');
  }

  return { valid: errors.length === 0, errors, value };
};

module.exports = {
  normalizeCaseState,
  validateCaseState,
};
