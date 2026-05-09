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

const getProviderName = () => {
  return process.env.LLM_PROVIDER || 'gemini';
};

module.exports = {
  generateJson,
  getProviderName
};
