const TriageSession = require('../models/TriageSession');
const { getGuidedCareContext, getRecentTriageHistory, getTriageProfileContext, getPatientVisibleStatus } = require('../mcp/caseContext/services/caseContextService');

/**
 * Builds the official safety-first context for the Guided Care Assistant.
 * Uses the strictly sanitized matrisense-case-context-mcp service layer to ensure NO unauthorized 
 * PII or sensitive system data leaks into the LLM prompt.
 * 
 * @param {string} sessionId - Mongoose triage session ID
 * @param {string} intent - Detected LLM intent for deterministic routing (optional)
 * @returns {Object} Context payload for AI assistant formatted for prompt builder
 */
const buildAssistantContext = async (sessionId, intent = null) => {
  if (!sessionId) {
    throw new Error('Session ID is required to build assistant context');
  }

  // Load baseline session metadata purely for routing
  const session = await TriageSession.findById(sessionId).select('patientId inputTextBn careGuidanceContext status');
  if (!session) {
    throw new Error(`Triage session not found: ${sessionId}`);
  }

  const patientId = session.patientId;
  const requester = { role: 'INTERNAL' }; // Internal service backend boundary bypass for LLM context fetching

  // 1. Core Guided Care Fetch via Service Layer
  const guidedContext = await getGuidedCareContext({ sessionId, patientId, requester }) || {};

  // 2. Intent-Deterministic Logic injections
  let previousHistory = [];
  if (patientId) {
    // If the intent explicitly asks for history, or by default just load background history
    const histData = await getRecentTriageHistory({ patientId, limit: 3, requester });
    previousHistory = histData.history;
  }

  let patientVisibleStatus = guidedContext.patientVisibleStatus;
  if (intent === 'ASK_CASE_STATUS') {
    const statusData = await getPatientVisibleStatus({ sessionId, requester });
    patientVisibleStatus = statusData ? statusData.caseStatus : patientVisibleStatus;
  }

  // 3. Profile Info (Strictly Sanitized MCP variant)
  let patientProfile = null;
  if (patientId) {
    patientProfile = await getTriageProfileContext({ patientId, sessionId, requester });
  }

  // 4. Map back to prompt builder's expected interface
  return {
    sessionId: guidedContext.sessionId || session._id,
    patientId: patientId || null,
    riskLevel: guidedContext.riskLevel || 'UNKNOWN',
    caseState: {
      symptoms: guidedContext.mainSymptoms || [],
      dangerSignsChecked: guidedContext.keyNegations || [],
      duration: guidedContext.durationSummary || {},
      followUpAnswers: guidedContext.followUpSummary || {}
    },
    inputTextBn: session.inputTextBn || '',
    symptoms: guidedContext.mainSymptoms || [],
    followUpAnswers: guidedContext.followUpSummary || {},
    careGuidanceContext: session.careGuidanceContext || {},
    retrievedCards: session.careGuidanceContext?.retrievedCards || session.careGuidanceContext?.cards || [],
    retrievedChunks: session.careGuidanceContext?.vectorChunks || session.careGuidanceContext?.retrievedChunks || [],

    assignedHospital: guidedContext.referralStatus?.name || null,
    workerStatus: session.status || 'active',

    previousHistory: previousHistory.map(h => ({
      date: h.date ? new Date(h.date).toLocaleDateString('en-US') : 'Unknown',
      riskLevel: h.riskLevel,
      status: h.status,
      assignedHospital: h.referralStatus?.name || null
    })),

    patientProfile: patientProfile ? {
      name: 'HIDDEN FOR PATIENT SAFETY', // Service strips name normally
      age: patientProfile.ageGroup,
      phone: 'HIDDEN FOR PATIENT SAFETY',
      trimester: patientProfile.trimester,
      gestationalWeek: patientProfile.gestationalWeek,
      knownRiskFactors: patientProfile.knownRiskFactors,
      district: patientProfile.district,
      upazilaOrThana: patientProfile.upazila,
      consentToUseLocationForReferral: false
    } : null,

    // Specific MCP Service Safety bounds
    safetyBoundaries: guidedContext.safetyBoundaries,
    recommendedAssistantTone: guidedContext.recommendedAssistantTone,
    documentUploadSummary: patientProfile?.documentUploadSummary || null
  };
};

module.exports = {
  buildAssistantContext
};
