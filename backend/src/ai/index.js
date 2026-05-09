const { generateJson, getProviderName } = require('./llmClient');
const { generateTriageExplanation } = require('./services/explanationService');

module.exports = {
  generateTriageExplanation,
  generateJson,
  getProviderName
};
