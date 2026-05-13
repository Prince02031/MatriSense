const explanationSchema = {
  type: "OBJECT",
  properties: {
    riskLevel: {
      type: "STRING",
      description: "The risk level, must be LOW, MEDIUM, or HIGH"
    },
    motherExplanationBn: {
      type: "STRING",
      description: "A simple, empathetic explanation in Bangla for the mother about her condition, without mentioning exact diagnoses."
    },
    stepsNowBn: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Array of immediate actionable steps for the mother in Bangla."
    },
    monitorBn: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Array of things the mother should monitor in Bangla."
    },
    urgentWarningBn: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Array of urgent warning signs in Bangla to watch out for."
    },
    healthWorkerSummaryBn: {
      type: "STRING",
      description: "A short medical summary for the health worker in Bangla."
    },
    safetyDisclaimerBn: {
      type: "STRING",
      description: "The mandatory safety disclaimer in Bangla."
    }
  },
  required: [
    "riskLevel",
    "motherExplanationBn",
    "stepsNowBn",
    "monitorBn",
    "urgentWarningBn",
    "healthWorkerSummaryBn",
    "safetyDisclaimerBn"
  ]
};

const validateExplanationOutput = (output) => {
  const issues = [];
  
  if (!output || typeof output !== 'object') {
    return { valid: false, issues: ['Output is missing or not an object'], data: null };
  }

  // 1. riskLevel
  if (!['LOW', 'MEDIUM', 'HIGH'].includes(output.riskLevel)) {
    issues.push(`Invalid riskLevel: "${output.riskLevel}". Must be LOW, MEDIUM, or HIGH.`);
  }

  // 2. motherExplanationBn
  if (typeof output.motherExplanationBn !== 'string') {
    issues.push('motherExplanationBn must be a string.');
  }

  // 3. stepsNowBn
  if (!Array.isArray(output.stepsNowBn) || !output.stepsNowBn.every(i => typeof i === 'string')) {
    issues.push('stepsNowBn must be an array of strings.');
  }

  // 4. monitorBn
  if (!Array.isArray(output.monitorBn) || !output.monitorBn.every(i => typeof i === 'string')) {
    issues.push('monitorBn must be an array of strings.');
  }

  // 5. urgentWarningBn
  if (!Array.isArray(output.urgentWarningBn) || !output.urgentWarningBn.every(i => typeof i === 'string')) {
    issues.push('urgentWarningBn must be an array of strings.');
  }

  // 6. healthWorkerSummaryBn
  if (typeof output.healthWorkerSummaryBn !== 'string') {
    issues.push('healthWorkerSummaryBn must be a string.');
  }

  // 7. safetyDisclaimerBn
  if (typeof output.safetyDisclaimerBn !== 'string') {
    issues.push('safetyDisclaimerBn must be a string.');
  }

  const valid = issues.length === 0;

  return {
    valid,
    issues,
    data: valid ? output : null
  };
};

module.exports = {
  explanationSchema,
  validateExplanationOutput
};
