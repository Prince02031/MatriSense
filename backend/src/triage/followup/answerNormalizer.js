const normalizeFollowUpAnswer = (questionId, answer) => {
	if (typeof answer === 'string') {
		const normalized = answer.trim().toLowerCase();
		if (normalized === 'yes' || normalized === 'true') return { questionId, value: true };
		if (normalized === 'no' || normalized === 'false') return { questionId, value: false };
		return { questionId, value: answer };
	}

	return { questionId, value: answer };
};

module.exports = { normalizeFollowUpAnswer };
