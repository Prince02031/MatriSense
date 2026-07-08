const { generateJsonFromImage } = require('../ai/llmClient');

/**
 * Maternal-specific danger thresholds (WHO / ACOG guidelines for pregnancy).
 * Used to independently re-derive severity from the numeric value Gemini
 * extracted, rather than trusting the model's own severity judgement.
 */
const MATERNAL_THRESHOLDS = {
  blood_pressure_systolic: { warning: 140, critical: 160 },
  blood_pressure_diastolic: { warning: 90, critical: 110 },
  hemoglobin: { warning: 11, critical: 7, direction: 'lower_is_worse' },
  fasting_blood_sugar: { warning: 96, critical: 126 },
  platelet_count: { warning: 150000, critical: 100000, direction: 'lower_is_worse' },
};

const DOCUMENT_TYPES = ['prescription', 'lab_report', 'ultrasound_report', 'blood_pressure_card', 'other'];
const SEVERITIES = ['NORMAL', 'WARNING', 'CRITICAL'];

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    documentType: { type: 'STRING', enum: DOCUMENT_TYPES },
    language: { type: 'STRING', enum: ['bn', 'en', 'mixed'] },
    isReadable: { type: 'BOOLEAN' },
    extractedValues: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          parameter: { type: 'STRING' },
          displayName: { type: 'STRING' },
          displayNameBn: { type: 'STRING' },
          value: { type: 'NUMBER' },
          unit: { type: 'STRING' },
          isAbnormal: { type: 'BOOLEAN' },
          severity: { type: 'STRING', enum: SEVERITIES },
          maternalThreshold: { type: 'STRING' },
          confidence: { type: 'NUMBER' },
        },
        required: ['parameter', 'displayName', 'value', 'severity'],
      },
    },
    medications: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          dosage: { type: 'STRING' },
          frequency: { type: 'STRING' },
        },
      },
    },
    riskFactorsDetected: { type: 'ARRAY', items: { type: 'STRING' } },
    summary: { type: 'STRING' },
    summaryBn: { type: 'STRING' },
    rawTextDetected: { type: 'STRING' },
  },
  required: ['documentType', 'isReadable', 'extractedValues', 'summary'],
};

const SYSTEM_INSTRUCTION = `You are a medical document analyzer for MatriSense, a maternal health triage system.

Analyze the uploaded medical document image. Extract ALL medical values you can identify.

IMPORTANT CONTEXT:
- The patient is a pregnant woman
- Documents may be in Bangla, English, or mixed
- Documents may be handwritten or printed
- Apply MATERNAL-SPECIFIC thresholds (pregnancy changes normal ranges)

MATERNAL DANGER THRESHOLDS:
- Blood Pressure Systolic: >=140 mmHg -> hypertension/pre-eclampsia risk
- Blood Pressure Diastolic: >=90 mmHg -> hypertension/pre-eclampsia risk
- Hemoglobin: <11 g/dL -> anemia; <7 g/dL -> severe anemia
- Fasting Blood Sugar: >95 mg/dL -> gestational diabetes risk
- Urine Protein: positive/trace+ -> pre-eclampsia risk
- Platelet Count: <150,000 -> HELLP syndrome risk

If the image is not a legible medical document, set isReadable to false and return an empty extractedValues array.
Use parameter values from this fixed set when applicable: blood_pressure_systolic, blood_pressure_diastolic, hemoglobin, fasting_blood_sugar, urine_protein, platelet_count. Use additional descriptive parameter names for anything else you find.
Return ONLY the JSON object described by the response schema.`;

const USER_PROMPT = 'Analyze this medical document image and extract the structured data as instructed.';

/**
 * Maps AI-detected risk factor labels onto the boolean flags the rule
 * engine actually understands (see Patient.knownRiskFactors / caseState.validator.js).
 *
 * Gemini returns free-text descriptive phrases (e.g. "Hypertension/Pre-eclampsia
 * risk"), not the clean single-word labels a static example might suggest, so
 * matching is done by keyword containment rather than exact string equality.
 */
const RISK_FACTOR_KEYWORD_MAP = [
  { keywords: ['hypertension', 'pre-eclampsia', 'preeclampsia', 'pre eclampsia'], flag: 'hypertension' },
  { keywords: ['anemia', 'anaemia'], flag: 'anemia' },
  { keywords: ['diabetes'], flag: 'diabetes' },
];

/**
 * Re-derives severity from the numeric value using our own threshold table,
 * overriding whatever the model reported. This is the safety double-check
 * called out in the feature's safety boundaries: the AI extracts values,
 * it does not get the final word on what's dangerous.
 */
function reclassifySeverity(parameter, value) {
  const threshold = MATERNAL_THRESHOLDS[parameter];
  if (!threshold || typeof value !== 'number' || Number.isNaN(value)) return null;

  const lowerIsWorse = threshold.direction === 'lower_is_worse';

  if (lowerIsWorse) {
    if (value < threshold.critical) return 'CRITICAL';
    if (value < threshold.warning) return 'WARNING';
    return 'NORMAL';
  }

  if (value >= threshold.critical) return 'CRITICAL';
  if (value >= threshold.warning) return 'WARNING';
  return 'NORMAL';
}

function normalizeExtractedValue(raw) {
  const value = typeof raw.value === 'number' ? raw.value : Number(raw.value);
  const numericValue = Number.isFinite(value) ? value : null;

  const enforcedSeverity = numericValue !== null ? reclassifySeverity(raw.parameter, numericValue) : null;
  const severity = enforcedSeverity || (SEVERITIES.includes(raw.severity) ? raw.severity : 'NORMAL');

  return {
    parameter: raw.parameter || 'unknown',
    displayName: raw.displayName || raw.parameter || 'Unknown value',
    displayNameBn: raw.displayNameBn || '',
    value: numericValue,
    unit: raw.unit || '',
    isAbnormal: severity !== 'NORMAL',
    severity,
    maternalThreshold: raw.maternalThreshold || '',
    confidence: typeof raw.confidence === 'number' ? Math.max(0, Math.min(1, raw.confidence)) : 0.5,
  };
}

/**
 * Normalizes the raw Gemini output into a safe, predictable shape and
 * re-applies deterministic threshold checks on top of the model's output.
 */
function normalizeAnalysisResult(raw) {
  const extractedValues = Array.isArray(raw.extractedValues)
    ? raw.extractedValues.map(normalizeExtractedValue)
    : [];

  const riskFactorsDetected = Array.isArray(raw.riskFactorsDetected)
    ? raw.riskFactorsDetected.filter((f) => typeof f === 'string')
    : [];

  return {
    documentType: DOCUMENT_TYPES.includes(raw.documentType) ? raw.documentType : 'other',
    language: ['bn', 'en', 'mixed'].includes(raw.language) ? raw.language : 'mixed',
    isReadable: raw.isReadable !== false,
    extractedValues,
    medications: Array.isArray(raw.medications) ? raw.medications : [],
    riskFactorsDetected,
    summary: raw.summary || '',
    summaryBn: raw.summaryBn || '',
    rawTextDetected: raw.rawTextDetected || '',
  };
}

/**
 * Maps detected risk factor labels to the Patient.knownRiskFactors boolean
 * flags recognized by the triage rule engine. Unrecognized labels are
 * dropped rather than written as free-form keys the engine can't evaluate.
 */
function mapToKnownRiskFactorFlags(riskFactorsDetected) {
  const flags = {};
  for (const label of riskFactorsDetected) {
    const lower = label.toLowerCase();
    for (const { keywords, flag } of RISK_FACTOR_KEYWORD_MAP) {
      if (keywords.some((kw) => lower.includes(kw))) {
        flags[flag] = true;
      }
    }
  }
  return flags;
}

/**
 * Sends the image to Gemini Vision, normalizes the structured output, and
 * independently re-validates severity against maternal thresholds.
 */
async function analyzeDocument({ imageBuffer, mimeType }) {
  if (!imageBuffer || !imageBuffer.length) {
    throw new Error('imageBuffer is required for document analysis');
  }
  if (!mimeType) {
    throw new Error('mimeType is required for document analysis');
  }

  const raw = await generateJsonFromImage({
    systemInstruction: SYSTEM_INSTRUCTION,
    userPrompt: USER_PROMPT,
    responseSchema: RESPONSE_SCHEMA,
    temperature: 0.1,
    imageBase64: imageBuffer.toString('base64'),
    mimeType,
  });

  const result = normalizeAnalysisResult(raw);
  result.knownRiskFactorFlags = mapToKnownRiskFactorFlags(result.riskFactorsDetected);

  return result;
}

module.exports = {
  analyzeDocument,
  normalizeAnalysisResult,
  reclassifySeverity,
  mapToKnownRiskFactorFlags,
  MATERNAL_THRESHOLDS,
};
