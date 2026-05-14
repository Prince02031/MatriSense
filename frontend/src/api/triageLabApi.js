/**
 * Triage Lab API Client
 * Supports end-to-end testing of the AI triage pipeline.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Executes a full triage lab run with all intermediate stages.
 * @param {Object} payload - { patientProfile, inputTextBn, checkedDangerSigns, confirmedSymptoms, followUpAnswers, runLlm }
 * @returns {Promise<Object>} The pipeline result including all debug stages.
 */
export const runTriageLab = async (payload) => {
  try {
    const response = await fetch(`${API_BASE}/api/dev/triage-lab/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle structured backend errors
      if (data.errors && Array.isArray(data.errors)) {
        throw new Error(data.errors.join(' | '));
      }
      throw new Error(data.message || data.error || `Server responded with ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('[TriageLabApi] Run failed:', error);
    
    // Provide user-friendly error messages for common failure modes
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Could not connect to the backend server. Please ensure it is running at ' + API_BASE);
    }
    
    throw error;
  }
};
