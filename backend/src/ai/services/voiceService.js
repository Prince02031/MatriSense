const axios = require('axios');
const fs = require('fs');

/**
 * VoiceService
 * Handles Speech-to-Text (STT) via Groq Whisper API.
 * Uses native FormData available in Node.js 22+.
 */
class VoiceService {
  /**
   * Transcribes audio file to text using Groq Whisper.
   * @param {string} filePath - Path to the recorded audio file.
   * @returns {Promise<string>} - Transcribed Bangla text.
   */
  async transcribeAudio(filePath) {
    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3-turbo';

    if (!apiKey) {
      throw new Error('[VoiceService] GROQ_API_KEY is missing.');
    }

    // Use native FormData
    const formData = new FormData();
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'audio/webm' });
    
    formData.append('file', blob, 'audio.webm');
    formData.append('model', model);
    formData.append('language', 'bn');
    formData.append('response_format', 'json');

    try {
      const response = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', formData, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          // Axios handles the Content-Type for native FormData
        }
      });

      return response.data.text;
    } catch (error) {
      console.error('[VoiceService] Transcription Error:', error.response?.data || error.message);
      throw new Error(`Transcription failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

module.exports = new VoiceService();
