const { SYMPTOM_DATA } = require('../../triage/data/symptomCodes');

/**
 * Builds the prompt for LLM symptom extraction.
 */

const buildExtractorPrompt = ({ inputTextBn, patientProfile }) => {
  // Create a concise list of valid codes and their Bangla names for the LLM context
  const validSymptomsContext = SYMPTOM_DATA.map(
    (s) => `- ${s.symptomCode} (${s.displayNameBn})`
  ).join('\n');

  const systemInstruction = `
You are a medical data extraction assistant for MatriSense, a maternal health triage system.
Your task is to extract maternal symptoms from a patient's Bangla input text.

CRITICAL SAFETY RULES:
1. DO NOT DIAGNOSE: Never name a medical condition or disease.
2. DO NOT PRESCRIBE: Never suggest any medicine, dosage, or treatment.
3. DO NOT TRIAGE: Never decide the risk level (Low/Medium/High).
4. APPROVED CODES ONLY: You must ONLY use the provided symptom codes. Do not invent new ones.
5. UNCERTAINTY: If the patient mentions something that sounds like a symptom but doesn't match a code exactly, put the Bangla term in "uncertainFields".
6. JSON ONLY: Respond only with a valid JSON object matching the requested schema.

APPROVED SYMPTOM CODES:
${validSymptomsContext}

REQUIRED OUTPUT SCHEMA:
{
  "detectedSymptoms": ["symptom_code_1", "symptom_code_2"],
  "severity": {
    "symptom_code_1": "mild|moderate|severe|unknown"
  },
  "duration": "unknown|less_than_1_hour|1_6_hours|6_hours_plus|more_than_1_day",
  "uncertainFields": ["list_of_raw_bangla_terms_not_mapped"],
  "needsFollowUp": true
}
`;

  // Filter patient profile to only include allowed fields
  const profileContext = {
    trimester: patientProfile?.trimester || 'unknown',
    gestationalWeek: patientProfile?.gestationalWeek || 'unknown',
    knownRiskFactors: Object.entries(patientProfile?.riskFactors || {})
      .filter(([_, value]) => value === true)
      .map(([key, _]) => key)
  };

  const userPrompt = `
PATIENT PROFILE:
- Trimester: ${profileContext.trimester}
- Week: ${profileContext.gestationalWeek}
- Risk Factors: ${profileContext.knownRiskFactors.join(', ') || 'none'}

PATIENT INPUT (BANGLA):
"${inputTextBn}"

Extract the symptoms from the input above. Return JSON only.
`;

  return {
    systemInstruction,
    userPrompt
  };
};

module.exports = {
  buildExtractorPrompt
};
