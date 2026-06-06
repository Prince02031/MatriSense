const {
  FORBIDDEN_BANGLA_PATTERNS,
  FORBIDDEN_ENGLISH_PATTERNS,
  REQUIRED_DISCLAIMER_BN,
  ALWAYS_BLOCKED_ADVICE,
  HIGH_RISK_UNSAFE_HOMECARE_PATTERNS
} = require('./safetyRules');
const { fallbackTemplates } = require('./fallbackTemplates');

const getSafeFallback = (riskLevel) => {
  const level = (riskLevel && typeof riskLevel === 'string') ? riskLevel.toUpperCase() : 'MEDIUM';
  return fallbackTemplates[level] || fallbackTemplates['MEDIUM'];
};

const validatePreGeneration = (decision, careGuidanceContext) => {
  const issues = [];
  
  if (!decision || !decision.riskLevel) {
    issues.push('Missing decision or decision.riskLevel');
  }
  
  if (!decision || !decision.allowedGuidanceType) {
    issues.push('Missing decision.allowedGuidanceType');
  }
  
  if (!careGuidanceContext) {
    issues.push('Missing careGuidanceContext');
  } else {
    if (!careGuidanceContext.sources || !Array.isArray(careGuidanceContext.sources) || careGuidanceContext.sources.length === 0) {
      issues.push('Missing or empty careGuidanceContext.sources');
    }
    
    const blockedAdvice = Array.isArray(careGuidanceContext.blockedAdvice) ? careGuidanceContext.blockedAdvice : [];
    ALWAYS_BLOCKED_ADVICE.forEach(blocked => {
      if (!blockedAdvice.includes(blocked)) {
        issues.push(`careGuidanceContext.blockedAdvice is missing mandatory blocked item: "${blocked}"`);
      }
    });
  }
  
  if (decision && decision.riskLevel === 'HIGH') {
    if (decision.allowedGuidanceType === 'SELF_CARE_AND_MONITOR') {
      issues.push('HIGH risk cases cannot have SELF_CARE_AND_MONITOR as allowed guidance type');
    }
    
    if (careGuidanceContext && Array.isArray(careGuidanceContext.stepsNowBn)) {
      careGuidanceContext.stepsNowBn.forEach(step => {
        HIGH_RISK_UNSAFE_HOMECARE_PATTERNS.forEach(pattern => {
          if (step.includes(pattern)) {
            issues.push(`HIGH risk step contains unsafe home-care wording: "${pattern}"`);
          }
        });
      });
    }
  }

  const valid = issues.length === 0;
  return {
    valid,
    issues,
    safeOutput: valid ? null : getSafeFallback(decision?.riskLevel)
  };
};

const validateLLMOutput = (llmOutput, decision, careGuidanceContext) => {
  const issues = [];
  
  if (!llmOutput || typeof llmOutput !== 'object') {
    return {
      valid: false,
      issues: ['Invalid LLM output format or null output'],
      safeOutput: getSafeFallback(decision?.riskLevel)
    };
  }

  let outputStr = '';
  try {
    outputStr = JSON.stringify(llmOutput).toLowerCase();
  } catch (e) {
    return {
      valid: false,
      issues: ['LLM output cannot be stringified'],
      safeOutput: getSafeFallback(decision?.riskLevel)
    };
  }
  
  FORBIDDEN_BANGLA_PATTERNS.forEach(pattern => {
    if (outputStr.includes(pattern.toLowerCase())) {
      issues.push(`LLM output contains forbidden Bangla pattern: "${pattern}"`);
    }
  });

  FORBIDDEN_ENGLISH_PATTERNS.forEach(pattern => {
    if (outputStr.includes(pattern.toLowerCase())) {
      issues.push(`LLM output contains forbidden English pattern: "${pattern}"`);
    }
  });

  if (typeof llmOutput.safetyDisclaimerBn !== 'string' || !llmOutput.safetyDisclaimerBn.includes('রেজিস্টার্ড চিকিৎসকের')) {
    issues.push('Missing or incorrect safety disclaimer');
  }

  if (llmOutput.riskLevel && decision && llmOutput.riskLevel !== decision.riskLevel) {
    issues.push(`LLM output attempted to change riskLevel from ${decision.riskLevel} to ${llmOutput.riskLevel}`);
  }

  if (decision && decision.riskLevel === 'HIGH') {
    HIGH_RISK_UNSAFE_HOMECARE_PATTERNS.forEach(pattern => {
      if (outputStr.includes(pattern.toLowerCase())) {
        issues.push(`HIGH risk LLM output contains unsafe home-care wording: "${pattern}"`);
      }
    });
  }

  if (decision && decision.riskLevel === 'LOW') {
    if (!Array.isArray(llmOutput.urgentWarningBn) || llmOutput.urgentWarningBn.length === 0) {
      issues.push('LOW risk output is missing urgentWarningBn array');
    }
  }

  if (Array.isArray(llmOutput.stepsNowBn)) {
    const allowedSteps = [
      ...(careGuidanceContext?.stepsNowBn || []),
      ...(getSafeFallback(decision?.riskLevel)?.stepsNowBn || [])
    ];

    const riskLevel = decision?.riskLevel || 'UNKNOWN';

    // Helper to normalize strings (stripping punctuation, spaces, numbers, and list markers)
    const normalizeStr = (str) => {
      return str
        .replace(/[।,?!.:;\-\*•\s]/g, '')
        .replace(/[0-9০-৯]/g, '')
        .trim()
        .toLowerCase();
    };

    // Helper to extract significant words (length >= 2 to capture short Bengali words like "কম")
    const getSignificantWords = (str) => {
      return str
        .split(/[\s,।?!.:;\-\(\)\[\]"'\r\n]+/)
        .map(w => w.trim().toLowerCase())
        .filter(w => w.length >= 2);
    };

    llmOutput.stepsNowBn.forEach(step => {
      if (typeof step === 'string') {
        const cleanStep = step.trim();
        if (cleanStep.length === 0) return;

        let isAllowed = false;

        // Step 1: Normalization exact match
        const normalizedStep = normalizeStr(cleanStep);
        isAllowed = allowedSteps.some(allowed => {
          if (typeof allowed !== 'string') return false;
          return normalizeStr(allowed) === normalizedStep;
        });

        // Step 2: Dual-metric (recall & precision) token-based check if normalization exact match fails
        if (!isAllowed) {
          const generatedWords = getSignificantWords(cleanStep);

          if (generatedWords.length === 0) {
            isAllowed = true; // No significant words to validate
          } else {
            const generatedWordsSet = new Set(generatedWords);

            isAllowed = allowedSteps.some(allowed => {
              if (typeof allowed !== 'string') return false;
              const allowedWords = getSignificantWords(allowed);
              if (allowedWords.length === 0) return false;

              // Calculate intersection
              const intersection = allowedWords.filter(w => generatedWordsSet.has(w));
              const intersectionCount = intersection.length;

              // Recall: what fraction of the allowed step's words are in the generated step
              const recall = intersectionCount / allowedWords.length;

              // Precision: what fraction of the generated step's words are in the allowed step
              const precision = intersectionCount / generatedWords.length;

              // Apply strictness thresholds based on risk level
              if (riskLevel === 'HIGH') {
                return recall >= 0.75 && precision >= 0.60;
              } else {
                return recall >= 0.50 && precision >= 0.30;
              }
            });
          }
        }

        if (!isAllowed) {
          issues.push(`LLM output steps contain unauthorized guidance: "${step}"`);
        }
      }
    });
  }

  const valid = issues.length === 0;
  return {
    valid,
    issues,
    safeOutput: valid ? llmOutput : getSafeFallback(decision?.riskLevel)
  };
};

module.exports = {
  validatePreGeneration,
  validateLLMOutput,
  getSafeFallback
};
