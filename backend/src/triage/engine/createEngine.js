const { Engine } = require('json-rules-engine');

const createEngine = () => {
	const engine = new Engine([], { allowUndefinedFacts: true });

	engine.addOperator('notContains', (factValue, jsonValue) => {
		if (Array.isArray(factValue)) {
			return !factValue.includes(jsonValue);
		}
		if (typeof factValue === 'string') {
			return !factValue.includes(jsonValue);
		}
		return true;
	});

	return engine;
};

module.exports = { createEngine };
