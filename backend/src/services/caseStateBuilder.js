/**
 * Builds a clean, rule-engine-ready caseState from various inputs.
 * Merges AI extraction, patient history, and follow-up data.
 */

const buildCaseStateFromExtraction = ({
  patient,
  triageSession,
  extraction,
  normalizedFollowUp
}) => {
  // 1. Resolve Profile Context
  const trimester = triageSession?.caseState?.trimester || patient?.trimester || 'unknown';
  const gestationalWeek = triageSession?.caseState?.gestationalWeek || patient?.gestationalWeek || null;
  
  // Calculate days since last checkup if available
  let lastCheckupGapDays = null;
  if (patient?.lastCheckupDate) {
    const lastDate = new Date(patient.lastCheckupDate);
    const now = new Date();
    const diffTime = Math.abs(now - lastDate);
    lastCheckupGapDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // 2. Merge Symptoms (Deduplicated)
  const symptomsSet = new Set([
    ...(triageSession?.caseState?.symptoms || []),
    ...(extraction?.detectedSymptoms || []),
    ...(normalizedFollowUp?.symptomsToAdd || [])
  ]);

  // 3. Merge Severity Map
  const severity = {
    ...(triageSession?.caseState?.severity || {}),
    ...(extraction?.severity || {}),
    ...(normalizedFollowUp?.severityUpdates || {})
  };

  // 4. Merge Duration Map
  const duration = {
    ...(triageSession?.caseState?.duration || {}),
    // If the LLM provided a single duration string, map it to the first detected symptom
    ...(extraction?.duration && extraction.detectedSymptoms?.length > 0 
      ? { [extraction.detectedSymptoms[0]]: extraction.duration } 
      : {}),
    ...(normalizedFollowUp?.durationUpdates || {})
  };

  // 5. Build Final CaseState Object
  return {
    caseId: triageSession?._id?.toString() || 'unknown',
    patientId: patient?._id?.toString() || triageSession?.patientId || 'unknown',
    createdAt: triageSession?.createdAt || new Date().toISOString(),
    profile: {
      age: patient?.age,
      trimester,
      gestationalWeek,
      lastCheckupGapDays,
      riskFactors: {
        ...(patient?.riskFactors || {}),
        ...(triageSession?.caseState?.riskFactors || {})
      },
    },
    symptoms: Array.from(symptomsSet),
    severity,
    duration,
    dangerSignsChecked: triageSession?.caseState?.dangerSignsChecked || [],
    followUpAnswers: {
      ...(triageSession?.caseState?.followUpAnswers || {}),
      ...(normalizedFollowUp?.followUpAnswers || {})
    },
    meta: {
      locale: triageSession?.meta?.locale || 'bn',
      sourceRefs: triageSession?.meta?.sourceRefs || []
    }
  };
};

module.exports = {
  buildCaseStateFromExtraction
};
