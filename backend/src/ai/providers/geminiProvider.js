const { GoogleGenAI } = require('@google/genai');

/**
 * Gemini Provider for @google/genai (v2 SDK)
 */
const generateJsonWithGemini = async ({ systemInstruction, userPrompt, responseSchema, temperature }) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('[GeminiProvider] GEMINI_API_KEY is missing in environment variables.');
  }

  // Initialize v2 Client
  const client = new GoogleGenAI({ apiKey, apiVersion: 'v1alpha' });
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const temp = temperature !== undefined ? temperature : (process.env.LLM_TEMPERATURE ? parseFloat(process.env.LLM_TEMPERATURE) : 0.2);

  try {
    const result = await client.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: systemInstruction,
        temperature: temp,
        responseMimeType: 'application/json',
        responseSchema: responseSchema
      }
    });

    console.log('[GeminiProvider] RAW SDK Result:', JSON.stringify(result, null, 2));

    if (!result || !result.value) {
      // Check if it's in candidates or something else
      const altValue = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (altValue) {
        console.log('[GeminiProvider] Found data in candidates, parsing manually...');
        return JSON.parse(altValue);
      }
      throw new Error('[GeminiProvider] Received empty response from Gemini API.');
    }

    return result.value;

  } catch (error) {
    console.error('[GeminiProvider] SDK Failure:', error);
    throw new Error(`[GeminiProvider] API Failure: ${error.message}`);
  }
};

module.exports = {
  generateJsonWithGemini
};
