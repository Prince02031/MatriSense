const { generateJson } = require('../llmClient');
const { buildExplanationPrompt } = require('../prompts/explanationPrompt');
const { explanationSchema, validateExplanationOutput } = require('../schemas/explanationSchema');
const { validateLLMOutput, REQUIRED_DISCLAIMER_BN, getSafeFallback } = require('../../safety');

const generateTriageExplanation = async ({ decision, careGuidanceContext, caseState }) => {
  const provider = process.env.LLM_PROVIDER || 'gemini';
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  
  // Ensure the disclaimer is in constraints
  const llmConstraints = decision?.llmConstraints || [];
  if (!llmConstraints.includes('Include the mandatory safety disclaimer')) {
    llmConstraints.push(`Include the mandatory safety disclaimer: "${REQUIRED_DISCLAIMER_BN}"`);
  }
  
  if (decision) decision.llmConstraints = llmConstraints;

  const { systemInstruction, userPrompt } = buildExplanationPrompt({ decision, careGuidanceContext, caseState });

  // Early exit if API key is missing to avoid crashing or unnecessary API overhead
  if (provider === 'gemini' && !process.env.GEMINI_API_KEY) {
    return {
      llmOutput: null,
      safetyValidation: {
        valid: false,
        issues: ['LLM_PROVIDER is gemini but GEMINI_API_KEY is missing. Falling back to safe templates.']
      },
      safeOutput: getSafeFallback(decision?.riskLevel),
      provider,
      model
    };
  }

  try {
    const rawLlmOutput = await generateJson({
      systemInstruction,
      userPrompt,
      responseSchema: explanationSchema
    });

    // 1. Schema Validation (JS)
    const schemaValidation = validateExplanationOutput(rawLlmOutput);
    if (!schemaValidation.valid) {
      return {
        llmOutput: rawLlmOutput,
        safetyValidation: { valid: false, issues: [`Schema Validation Failed: ${schemaValidation.issues.join(', ')}`] },
        safeOutput: getSafeFallback(decision?.riskLevel),
        provider,
        model
      };
    }

    // 2. Strict Medical Safety Validation
    const safetyValidation = validateLLMOutput(schemaValidation.data, decision, careGuidanceContext);

    return {
      llmOutput: rawLlmOutput,
      safetyValidation: {
        valid: safetyValidation.valid,
        issues: safetyValidation.issues
      },
      safeOutput: safetyValidation.safeOutput,
      provider,
      model
    };
    
  } catch (error) {
    console.error('[ExplanationService] LLM Generation Error:', error);
    return {
      llmOutput: null,
      safetyValidation: {
        valid: false,
        issues: [`LLM Error: ${error.message}`]
      },
      safeOutput: getSafeFallback(decision?.riskLevel),
      provider,
      model
    };
  }
};

module.exports = {
  generateTriageExplanation
};
