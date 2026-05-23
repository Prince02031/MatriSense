// Triage API client

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const startTriage = async (patientId, symptomData) => {
  // Handled via Next.js route: /api/triage/start
  throw new Error('Use fetch("/api/triage/start", ...) directly');
};

export const confirmSymptoms = async (sessionId, confirmedSymptoms) => {
  // Handled via Next.js route: /api/triage/[sessionId]/confirm
  throw new Error('Use fetch("/api/triage/' + sessionId + '/confirm", ...) directly');
};

export const getFollowUpQuestions = async (sessionId) => {
  const response = await fetch(`/api/triage/${sessionId}/follow-up`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch follow-up questions');
  }

  return await response.json();
};

export const submitFollowUpAnswers = async (sessionId, answers) => {
  const response = await fetch(`/api/triage/${sessionId}/answers`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to submit follow-up answers');
  }

  return await response.json();
};

export const runTriage = async (sessionId) => {
  const response = await fetch(`/api/triage/${sessionId}/run`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to run triage');
  }

  return await response.json();
};

export const explainTriage = async (sessionId) => {
  const response = await fetch(`/api/triage/${sessionId}/explain`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate explanation');
  }

  return await response.json();
};

export const getTriageResult = async (sessionId) => {
  const response = await fetch(`/api/triage/${sessionId}/result`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch triage result');
  }

  return await response.json();
};
