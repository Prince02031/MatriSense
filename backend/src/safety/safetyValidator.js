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

    llmOutput.stepsNowBn.forEach(step => {
      if (typeof step === 'string') {
        const isAllowed = allowedSteps.some(allowed => 
          typeof allowed === 'string' && (
            step.trim() === allowed.trim() || 
            allowed.includes(step.trim())
          )
        );
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
