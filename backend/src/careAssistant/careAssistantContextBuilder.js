const TriageSession = require('../models/TriageSession');
const Patient = require('../models/Patient');

/**
 * Builds the official safety-first context for the Guided Care Assistant.
 * Loads all relevant session, patient, decision, and care guidance data directly
 * from the database to avoid reliance on client-side state.
 * 
 * @param {string} sessionId - Mongoose triage session ID
 * @returns {Object} Context payload for AI assistant
 */
const buildAssistantContext = async (sessionId) => {
  if (!sessionId) {
    throw new Error('Session ID is required to build assistant context');
  }

  const session = await TriageSession.findById(sessionId);
  if (!session) {
    throw new Error(`Triage session not found: ${sessionId}`);
  }

  // Load linked patient profile if available
  let patient = null;
  if (session.patientId) {
    patient = await Patient.findById(session.patientId);
  }

  // Load decision parameters
  const decision = session.decision || {};
  const riskLevel = decision.riskLevel || 'UNKNOWN';

  // Load symptoms (confirmed or caseState fallback)
  const symptoms = (session.confirmedSymptoms && session.confirmedSymptoms.length > 0)
    ? session.confirmedSymptoms
    : (session.caseState?.symptoms || []);

  // Load RAG guidance card sources
  const careGuidanceContext = session.careGuidanceContext || {};
  const retrievedCards = careGuidanceContext.retrievedCards || careGuidanceContext.cards || [];
  const retrievedChunks = careGuidanceContext.retrievedChunks || careGuidanceContext.chunks || [];

  // Parse dynamic or recommended assigned hospital if available
  let assignedHospital = null;
  if (decision.recommendedAction && typeof decision.recommendedAction === 'string') {
    // If recommendation mentions a referred facility, match/extract it
    assignedHospital = decision.recommendedAction;
  }
  if (session.caseState?.meta?.assignedHospital) {
    assignedHospital = session.caseState.meta.assignedHospital;
  }

  // Worker status of this session/case (lifecycle stage)
  const workerStatus = session.status || 'active';

  // Load previous triage history (up to last 3 sessions, excluding current one)
  // Only loaded when a patientId is linked to avoid cross-patient data leaks.
  let previousHistory = [];
  if (session.patientId) {
    try {
      const prevSessions = await TriageSession.find({
        patientId: session.patientId,
        _id: { $ne: session._id }
      })
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();

      previousHistory = prevSessions.map(s => {
        // Resolve hospital from recommended action or meta — same logic as current session
        let oldHospital = null;
        if (s.decision?.recommendedAction && typeof s.decision.recommendedAction === 'string') {
          oldHospital = s.decision.recommendedAction;
        }
        if (s.caseState?.meta?.assignedHospital) {
          oldHospital = s.caseState.meta.assignedHospital;
        }

        return {
          date: s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-US') : 'Unknown',
          riskLevel: s.decision?.riskLevel || 'UNKNOWN',
          symptoms: (s.confirmedSymptoms && s.confirmedSymptoms.length > 0)
            ? s.confirmedSymptoms
            : (s.caseState?.symptoms || []),
          status: s.status || 'completed',
          assignedHospital: oldHospital
        };
      });
    } catch (err) {
      // Non-fatal: assistant continues without history if query fails
      console.warn('[CareAssistantContextBuilder] Failed to load previous triage history:', err.message);
    }
  }

  return {
    sessionId: session._id,
    riskLevel,
    caseState: session.caseState || {},
    inputTextBn: session.inputTextBn || '',
    symptoms,
    followUpAnswers: session.caseState?.followUpAnswers || [],
    careGuidanceContext,
    retrievedCards,
    retrievedChunks,
    assignedHospital,
    workerStatus,
    previousHistory,
    patientProfile: patient ? {
      name: patient.name,
      age: patient.age,
      phone: patient.phone,
      trimester: patient.trimester,
      gestationalWeek: patient.gestationalWeek,
      knownRiskFactors: patient.knownRiskFactors || {}
    } : null
  };
};

module.exports = {
  buildAssistantContext
};
