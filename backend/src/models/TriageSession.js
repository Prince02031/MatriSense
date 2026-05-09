const mongoose = require('mongoose');

const TriageSessionSchema = new mongoose.Schema({
  patientId: { type: String, required: false },
  inputTextBn: { type: String, required: false },
  
  // Case State
  caseState: {
    symptoms: [String],
    dangerSignsChecked: [String],
    trimester: String,
    gestationalWeek: Number,
    riskFactors: mongoose.Schema.Types.Mixed,
    followUpAnswers: mongoose.Schema.Types.Mixed,
    meta: mongoose.Schema.Types.Mixed
  },

  // Rule Decision
  decision: mongoose.Schema.Types.Mixed,

  // RAG Context
  careGuidanceContext: mongoose.Schema.Types.Mixed,

  // LLM Explanation
  llmOutput: mongoose.Schema.Types.Mixed,
  safetyValidation: {
    valid: Boolean,
    issues: [String]
  },
  safeOutput: mongoose.Schema.Types.Mixed,

  status: { type: String, default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TriageSession', TriageSessionSchema);
