const { GoogleGenAI } = require('@google/genai');

const generateJsonWithGemini = async ({ systemInstruction, userPrompt, responseSchema, temperature }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('[GeminiProvider] GEMINI_API_KEY is missing in environment variables.');
  }

  const genAI = new GoogleGenAI(apiKey);
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const temp = temperature !== undefined ? temperature : (process.env.LLM_TEMPERATURE ? parseFloat(process.env.LLM_TEMPERATURE) : 0.2);

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemInstruction,
    generationConfig: {
      temperature: temp,
      responseMimeType: 'application/json',
      responseSchema: responseSchema
    }
  });

  try {
    const result = await model.generateContent(userPrompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error('[GeminiProvider] Received empty response from Gemini API.');
    }

    // Clean markdown if present (sometimes models wrap JSON in markdown even if requested not to)
    const cleanedString = text.replace(/^```json\n?/, '').replace(/```$/, '').trim();
    
    try {
      return JSON.parse(cleanedString);
    } catch (parseError) {
      console.error('[GeminiProvider] JSON Parse Error. Raw text:', text);
      throw new Error(`[GeminiProvider] Failed to parse JSON response. Check console for details.`);
    }

  } catch (error) {
    if (error.message.startsWith('[GeminiProvider]')) {
      throw error;
    }
    throw new Error(`[GeminiProvider] API Failure: ${error.message}`);
  }
};

module.exports = {
  generateJsonWithGemini
};
