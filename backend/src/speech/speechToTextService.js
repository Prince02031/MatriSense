const groqSttProvider = require('./providers/groqSttProvider');

/**
 * SpeechToTextService
 * Orchestrates STT requests across different providers.
 */
const transcribeAudio = async ({ file, language = 'bn' }) => {
  if (!file) {
    throw new Error('[STTService] No audio file provided for transcription.');
  }

  const provider = (process.env.STT_PROVIDER || 'groq').toLowerCase();

  switch (provider) {
    case 'groq':
      return groqSttProvider.transcribeWithGroq({ file, language });
    
    default:
      throw new Error(`[STTService] Unsupported or unconfigured STT_PROVIDER: "${provider}". Check your .env file.`);
  }
};

module.exports = {
  transcribeAudio
};
