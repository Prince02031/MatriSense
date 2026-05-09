const { FOLLOW_UP_MAP } = require('./followUpMap');

const selectFollowUpQuestions = (caseState = {}, maxQuestions = 3) => {
	const symptoms = caseState?.symptoms || [];
	const existingAnswers = caseState?.followUpAnswers || {};

	const questions = symptoms
		.flatMap((symptom) => FOLLOW_UP_MAP[symptom] || [])
		.filter((question) => !(question.id in existingAnswers))
		.sort((a, b) => (a.priority || 0) - (b.priority || 0));

	return questions.slice(0, maxQuestions);
};

module.exports = { selectFollowUpQuestions };
