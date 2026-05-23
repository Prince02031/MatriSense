/**
 * Speech API Client
 * Handles voice-to-text (STT) requests.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/**
 * Transcribes an audio blob to text via the backend STT service.
 * @param {Object} params - { audioBlob, language }
 * @returns {Promise<Object>} - { transcript, provider, model }
 */
export const transcribeAudio = async ({ audioBlob, language = 'bn' }) => {
  if (!audioBlob) {
    throw new Error('No audio data provided for transcription.');
  }

  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('language', language);

  try {
    const response = await fetch(`${API_BASE}/api/speech/transcribe`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Speech-to-Text transcription failed.');
    }

    return data;
  } catch (error) {
    console.error('[SpeechApi] Transcription failed:', error);
    
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Connection to voice server failed. Check your network or backend status.');
    }
    
    throw error;
  }
};
