// Placeholder engine factory (wire json-rules-engine here)
const { Engine } = require('json-rules-engine');

const createEngine = () => new Engine();

module.exports = { createEngine };
