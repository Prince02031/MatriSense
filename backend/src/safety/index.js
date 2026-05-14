const {
  validatePreGeneration,
  validateLLMOutput,
  getSafeFallback
} = require('./safetyValidator');

const { fallbackTemplates } = require('./fallbackTemplates');

const {
  FORBIDDEN_BANGLA_PATTERNS,
  FORBIDDEN_ENGLISH_PATTERNS,
  REQUIRED_DISCLAIMER_BN,
  ALWAYS_BLOCKED_ADVICE,
  HIGH_RISK_UNSAFE_HOMECARE_PATTERNS
} = require('./safetyRules');

module.exports = {
  validatePreGeneration,
  validateLLMOutput,
  getSafeFallback,
  fallbackTemplates,
  FORBIDDEN_BANGLA_PATTERNS,
  FORBIDDEN_ENGLISH_PATTERNS,
  REQUIRED_DISCLAIMER_BN,
  ALWAYS_BLOCKED_ADVICE,
  HIGH_RISK_UNSAFE_HOMECARE_PATTERNS
};
