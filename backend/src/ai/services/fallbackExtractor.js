const { BANGLA_SYMPTOM_SYNONYMS } = require('../../triage/data/banglaSymptomSynonyms');
const { isValidSymptomCode } = require('../../triage/data/symptomCodes');

/**
 * Fallback Symptom Extractor using simple keyword matching.
 * Ensures the system works even if the LLM is offline or unconfigured.
 */

const keywordFallbackExtract = ({ inputTextBn, checkedDangerSigns }) => {
  const detectedSymptoms = new Set();
  const input = (inputTextBn || '').toLowerCase();

  // 1. Simple Keyword Matching
  // Iterate through all approved symptoms and their synonyms
  for (const [code, synonyms] of Object.entries(BANGLA_SYMPTOM_SYNONYMS)) {
    const matched = synonyms.some(synonym => input.includes(synonym.toLowerCase()));
    if (matched) {
      detectedSymptoms.add(code);
      
      // Auto-add base symptoms for specific variations to ensure rule coverage
      if (code === 'severe_headache') detectedSymptoms.add('headache');
      if (code === 'severe_abdominal_pain') detectedSymptoms.add('abdominal_pain');
      if (code === 'vomiting_repeated') detectedSymptoms.add('vomiting');
    }
  }

  // 2. Merge with manually checked danger signs (if any)
  if (Array.isArray(checkedDangerSigns)) {
    checkedDangerSigns.forEach(sign => {
      if (isValidSymptomCode(sign)) {
        detectedSymptoms.add(sign);
      }
    });
  }

  const symptomsArray = Array.from(detectedSymptoms);

  // Return standard extraction shape
  return {
    detectedSymptoms: symptomsArray,
    severity: {}, // Keyword extractor doesn't infer severity
    duration: 'unknown', // Keyword extractor doesn't infer duration
    uncertainFields: [],
    needsFollowUp: symptomsArray.length > 0,
    source: 'fallback'
  };
};

module.exports = {
  keywordFallbackExtract
};
