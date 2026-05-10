const { generateJson } = require('../llmClient');
const { buildExtractorPrompt } = require('../prompts/extractorPrompt');
const { validateExtractorOutput } = require('../schemas/extractorSchema');
const { keywordFallbackExtract } = require('./fallbackExtractor');
const { normalizeSymptomList } = require('../../triage/data/symptomCodes');

/**
 * Orchestrates the symptom extraction process.
 * Attempts LLM extraction first, with a transparent fallback to keyword matching.
 */

const extractSymptomsFromBangla = async ({ inputTextBn, checkedDangerSigns, patientProfile }) => {
  // Early check for environment to avoid unnecessary API overhead/crashes
  const provider = process.env.LLM_PROVIDER || 'gemini';
  const hasKey = !!process.env.GEMINI_API_KEY;

  if (provider === 'gemini' && !hasKey) {
    console.warn('[ExtractorService] Gemini API Key missing. Skipping LLM and using keyword fallback.');
    return keywordFallbackExtract({ inputTextBn, checkedDangerSigns });
  }

  // 1. Build Prompt
  const { systemInstruction, userPrompt } = buildExtractorPrompt({ 
    inputTextBn, 
    patientProfile 
  });

  try {
    // 2. Call LLM
    const rawLlmOutput = await generateJson({
      systemInstruction,
      userPrompt,
      temperature: 0.1 // Lower temperature for higher extraction precision
    });

    // 3. Validate Schema
    const validation = validateExtractorOutput(rawLlmOutput);

    if (validation.valid) {
      // Normalize and merge with manually checked danger signs
      const combinedSymptoms = new Set([
        ...normalizeSymptomList(validation.data.detectedSymptoms),
        ...(checkedDangerSigns || []).filter(s => typeof s === 'string')
      ]);

      return {
        detectedSymptoms: Array.from(combinedSymptoms),
        severity: validation.data.severity || {},
        duration: validation.data.duration || 'unknown',
        uncertainFields: validation.data.uncertainFields || [],
        needsFollowUp: validation.data.needsFollowUp ?? true,
        source: 'llm',
        rawLlmOutput // Preserved for admin audit/debugging
      };
    } else {
      // Schema mismatch: use fallback but include issues for debugging
      console.warn('[ExtractorService] LLM response failed schema validation. Using fallback.');
      const fallback = keywordFallbackExtract({ inputTextBn, checkedDangerSigns });
      return {
        ...fallback,
        validationIssues: validation.issues,
        rawLlmOutput
      };
    }

  } catch (error) {
    // API Failure (Network, Rate Limit, etc.): use fallback
    console.error('[ExtractorService] LLM API failure. Falling back to keyword matching.', error.message);
    const fallback = keywordFallbackExtract({ inputTextBn, checkedDangerSigns });
    return {
      ...fallback,
      error: error.message
    };
  }
};

module.exports = {
  extractSymptomsFromBangla
};
