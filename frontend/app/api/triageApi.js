// Triage API client

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const startTriage = async (patientId, symptomData) => {
  // TODO: POST /api/triage/start
};

export const confirmSymptoms = async (sessionId, confirmedSymptoms) => {
  // TODO: POST /api/triage/:sessionId/confirm
};

export const getFollowUpQuestions = async (sessionId) => {
  // TODO: GET /api/triage/:sessionId/follow-up
};

export const submitFollowUpAnswers = async (sessionId, answers) => {
  // TODO: POST /api/triage/:sessionId/answers
};

export const runTriage = async (sessionId) => {
  // TODO: POST /api/triage/:sessionId/run
};

export const getTriageResult = async (sessionId) => {
  // TODO: GET /api/triage/:sessionId/result
};
