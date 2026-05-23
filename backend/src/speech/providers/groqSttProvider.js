const axios = require('axios');
const fs = require('fs');

/**
 * Groq STT Provider
 * Uses Groq's Whisper API for high-quality speech-to-text.
 */
const transcribeWithGroq = async ({ file, language = 'bn' }) => {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_STT_MODEL || 'whisper-large-v3'; 

  if (!apiKey) {
    throw new Error('[GroqSttProvider] GROQ_API_KEY is missing in .env.');
  }

  if (!file || !file.path) {
    throw new Error('[GroqSttProvider] Invalid or missing audio file path.');
  }

  console.log(`[GroqSttProvider] Transcribing: size=${file.size} bytes, type=${file.mimetype}, lang=${language}`);

  // Use native FormData
  const formData = new FormData();
  const fileBuffer = fs.readFileSync(file.path);
  
  // Create blob with explicit type
  const blob = new Blob([fileBuffer], { type: 'audio/webm' });
  
  formData.append('file', blob, 'recording.webm');
  formData.append('model', model);
  formData.append('language', 'bn'); // Hardcode to bn for now to force it
  formData.append('prompt', 'এটি একটি গর্ভবতী মায়ের স্বাস্থ্য বিষয়ক কথোপকথন।'); // Help Whisper stay in Bangla
  formData.append('response_format', 'json');

  try {
    const response = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', formData, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'multipart/form-data'
      }
    });

    return {
      transcript: response.data.text,
      provider: 'groq',
      model: model
    };
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    console.error('[GroqSttProvider] API Error:', errorMsg);
    throw new Error(`Groq STT Failure: ${errorMsg}`);
  }
};

module.exports = {
  transcribeWithGroq
};
