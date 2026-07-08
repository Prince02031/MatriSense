const { GoogleGenAI } = require('@google/genai');

const UploadedDocument = require('../models/UploadedDocument');
const ClinicalDataPoint = require('../models/ClinicalDataPoint');
const { reclassifySeverity } = require('./documentAnalysisService');

const TOOL_DECLARATION = {
  name: 'record_confirmed_value',
  description: 'Records the patient\'s confirmation or correction of one extracted value from their uploaded document.',
  parameters: {
    type: 'OBJECT',
    properties: {
      parameter: { type: 'STRING', description: 'The parameter key of the value being confirmed/corrected, exactly as given in the document values list (e.g. blood_pressure_systolic).' },
      confirmed: { type: 'BOOLEAN', description: 'true if the patient confirmed the value is correct as extracted.' },
      correctedValue: { type: 'NUMBER', description: 'Only set if the patient stated a different numeric value.' },
    },
    required: ['parameter', 'confirmed'],
  },
};

const SAFETY_BOUNDARIES = {
  canDiagnose: false,
  canPrescribe: false,
  canSuggestDosage: false,
  mustPreserveUrgency: true,
};

function buildSystemInstruction(analysis) {
  const valuesList = (analysis.extractedValues || [])
    .map((v) => `- ${v.parameter} (${v.displayName}): ${v.value ?? 'N/A'} ${v.unit || ''} — severity: ${v.severity}`)
    .join('\n');

  return `You are a friendly assistant helping a pregnant patient in Bangladesh review values extracted by AI from a photo of her medical document.

DOCUMENT SUMMARY: ${analysis.summary || 'N/A'}

EXTRACTED VALUES:
${valuesList || 'None extracted.'}

YOUR JOB:
- Walk the patient through the extracted values in plain, simple language (mix of Bangla/English is fine, mirror the user's language).
- Ask her to confirm each value is correct, or tell you the correct value if the photo was misread.
- When she confirms a value, or gives a corrected number, call the record_confirmed_value tool for that parameter.
- Do not diagnose, do not prescribe medication or dosages, do not tell her a value is "safe" or "fine" if it was flagged WARNING/CRITICAL — only a health worker/doctor determines what to do about it.
- Keep replies short and conversational, one or two values at a time.

SAFETY BOUNDARIES: ${JSON.stringify(SAFETY_BOUNDARIES)}`;
}

function mapHistoryToContents(chatHistory) {
  return (chatHistory || [])
    .filter((m) => m && m.content && (m.role === 'user' || m.role === 'assistant'))
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
}

/**
 * Applies a patient's confirmation/correction to the matching ClinicalDataPoint
 * row. If a corrected numeric value is supplied, severity is independently
 * re-derived via reclassifySeverity() rather than trusted from the chat model —
 * the same safety double-check used for the original document extraction.
 */
async function applyConfirmation({ patientId, documentId, parameter, confirmed, correctedValue }) {
  const row = await ClinicalDataPoint.findOne({
    patientId,
    sourceDocumentId: documentId,
    parameter,
    isActive: true,
  });

  if (!row) {
    return { error: `No extracted value found for parameter "${parameter}" on this document.` };
  }

  if (confirmed) {
    row.confirmedByPatient = true;
    row.confirmedAt = new Date();
  }

  if (typeof correctedValue === 'number' && Number.isFinite(correctedValue)) {
    row.value = correctedValue;
    const recheckedSeverity = reclassifySeverity(parameter, correctedValue);
    if (recheckedSeverity) {
      row.severity = recheckedSeverity;
      row.isAbnormal = recheckedSeverity !== 'NORMAL';
    }
    row.confirmedByPatient = true;
    row.confirmedAt = new Date();
  }

  await row.save();

  return {
    parameter: row.parameter,
    value: row.value,
    unit: row.unit,
    severity: row.severity,
    confirmedByPatient: row.confirmedByPatient,
  };
}

/**
 * Runs one turn of the standalone document-review chat. Stateless per call —
 * the caller resends chatHistory each turn, matching the existing triage
 * chat's pattern (no server-side chat persistence in this app).
 */
async function runDocumentReviewChat({ documentId, patientId, message, chatHistory, language }) {
  const doc = await UploadedDocument.findOne({ _id: documentId, ownerType: 'PATIENT', ownerId: patientId, isActive: true });
  if (!doc) {
    throw new Error('Document not found or you do not have access to it.');
  }
  if (!doc.documentAnalysis) {
    throw new Error('This document has not been analyzed yet.');
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing');
  }

  const client = new GoogleGenAI({ apiKey, apiVersion: 'v1alpha' });
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const systemInstruction = buildSystemInstruction(doc.documentAnalysis);

  const contents = [
    ...mapHistoryToContents(chatHistory),
    { role: 'user', parts: [{ text: message }] },
  ];

  const updatedValues = [];

  // Single round of tool-calling: the model may call record_confirmed_value
  // zero or more times in response to this one message, then we ask it for
  // a final conversational reply once tool results are known.
  const toolResponse = await client.models.generateContent({
    model: modelName,
    contents,
    config: {
      systemInstruction,
      tools: [{ functionDeclarations: [TOOL_DECLARATION] }],
    },
  });

  const calls = toolResponse.functionCalls || [];

  if (calls.length > 0) {
    contents.push({
      role: 'model',
      parts: toolResponse?.candidates?.[0]?.content?.parts || calls.map((c) => ({ functionCall: c })),
    });

    for (const call of calls) {
      const result = await applyConfirmation({
        patientId,
        documentId,
        parameter: call.args?.parameter,
        confirmed: call.args?.confirmed,
        correctedValue: call.args?.correctedValue,
      });
      if (!result.error) updatedValues.push(result);

      contents.push({
        role: 'tool',
        parts: [{ functionResponse: { name: call.name, response: result } }],
      });
    }
  }

  const finalResponse = await client.models.generateContent({
    model: modelName,
    contents,
    config: { systemInstruction },
  });

  const reply = finalResponse.text
    ?? finalResponse?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim()
    ?? 'Sorry, I could not process that. Could you rephrase?';

  return { reply, updatedValues };
}

module.exports = { runDocumentReviewChat };
