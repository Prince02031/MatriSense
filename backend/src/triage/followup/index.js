const { FOLLOW_UP_MAP } = require('./followUpMap');
const { selectFollowUpQuestions } = require('./followUpSelector');
const { normalizeFollowUpAnswers } = require('./answerNormalizer');

module.exports = {
  FOLLOW_UP_MAP,
  selectFollowUpQuestions,
  normalizeFollowUpAnswers
};
