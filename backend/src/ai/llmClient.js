const geminiProvider = require('./providers/geminiProvider');
const localProvider = require('./providers/localProvider');

const generateJson = async ({ systemInstruction, userPrompt, responseSchema, temperature }) => {
  const providerType = process.env.LLM_PROVIDER || 'gemini';

  switch (providerType.toLowerCase()) {
    case 'gemini':
      return geminiProvider.generateJsonWithGemini({ systemInstruction, userPrompt, responseSchema, temperature });
    case 'local':
      return localProvider.generateJsonWithLocal({ systemInstruction, userPrompt, responseSchema, temperature });
    default:
      throw new Error(`Unsupported LLM_PROVIDER: ${providerType}`);
  }
};

/**
 * Structured JSON extraction from an image (vision). Gemini-only for now —
 * the local provider does not have a multimodal path wired up.
 */
const generateJsonFromImage = async ({ systemInstruction, userPrompt, responseSchema, temperature, imageBase64, mimeType }) => {
  const providerType = process.env.LLM_PROVIDER || 'gemini';

  if (providerType.toLowerCase() !== 'gemini') {
    throw new Error(`Document image analysis requires LLM_PROVIDER=gemini (current: ${providerType})`);
  }

  return geminiProvider.generateJsonWithGeminiVision({ systemInstruction, userPrompt, responseSchema, temperature, imageBase64, mimeType });
};

const getProviderName = () => {
  return process.env.LLM_PROVIDER || 'gemini';
};

module.exports = {
  generateJson,
  generateJsonFromImage,
  getProviderName
};
