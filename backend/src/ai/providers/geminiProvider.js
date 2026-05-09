const { GoogleGenAI } = require('@google/genai');

const generateJsonWithGemini = async ({ systemInstruction, userPrompt, responseSchema, temperature }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('[GeminiProvider] GEMINI_API_KEY is missing in environment variables.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const temp = temperature !== undefined ? temperature : (process.env.LLM_TEMPERATURE ? parseFloat(process.env.LLM_TEMPERATURE) : 0.2);

  const config = {
    temperature: temp,
    systemInstruction,
    responseMimeType: 'application/json',
  };

  if (responseSchema) {
    config.responseSchema = responseSchema;
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config,
    });

    const text = response.text;
    if (!text) {
      throw new Error('[GeminiProvider] Received empty response from Gemini API.');
    }

    // Clean markdown if present
    const cleanedString = text.replace(/^```json\n?/, '').replace(/```$/, '').trim();
    
    try {
      return JSON.parse(cleanedString);
    } catch (parseError) {
      throw new Error(`[GeminiProvider] Failed to parse JSON response. Raw output: ${text.substring(0, 100)}...`);
    }

  } catch (error) {
    // If it's already one of our custom errors, rethrow it
    if (error.message.startsWith('[GeminiProvider]')) {
      throw error;
    }
    throw new Error(`[GeminiProvider] API Failure: ${error.message}`);
  }
};

module.exports = {
  generateJsonWithGemini
};
