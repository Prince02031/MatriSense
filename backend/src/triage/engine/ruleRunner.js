const { createEngine } = require('./createEngine');
const ruleSets = require('../rules');

const addRulesToEngine = (engine, rules = []) => {
  if (!Array.isArray(rules) || rules.length === 0) {
    return;
  }

  rules.forEach((rule) => engine.addRule(rule));
};

const runRules = async (facts = {}) => {
  const engine = createEngine();

  Object.values(ruleSets).forEach((set) => {
    addRulesToEngine(engine, set?.rules || []);
  });

  return engine.run(facts);
};

module.exports = { runRules };
