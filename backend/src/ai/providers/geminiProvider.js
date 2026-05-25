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

    // @google/genai v2 SDK returns result.text (a getter), not result.value
    // Try .text first, then fall back to candidates array
    const rawText = result?.text ?? result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      console.error('[GeminiProvider] Empty response. Raw result:', JSON.stringify(result, null, 2));
      throw new Error('[GeminiProvider] Received empty response from Gemini API.');
    }

    // When responseMimeType is 'application/json', the SDK may return a parsed object or a JSON string
    if (typeof rawText === 'object') {
      return rawText;
    }

    return JSON.parse(rawText);

  } catch (error) {
    console.error('[GeminiProvider] SDK Failure:', error);
    throw new Error(`[GeminiProvider] API Failure: ${error.message}`);
  }
};

module.exports = {
  generateJsonWithGemini
};
