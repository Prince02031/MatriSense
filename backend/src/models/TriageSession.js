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
    severity: mongoose.Schema.Types.Mixed,
    duration: mongoose.Schema.Types.Mixed,
    riskFactors: mongoose.Schema.Types.Mixed,
    followUpAnswers: mongoose.Schema.Types.Mixed,
    meta: mongoose.Schema.Types.Mixed
  },

  // Phase 2 — Symptom Confirmation
  confirmedSymptoms: { type: [String], default: [] },
  editedByUser: { type: Boolean, default: false },

  // Rule Decision
  decision: mongoose.Schema.Types.Mixed,

  // RAG Context
  careGuidanceContext: mongoose.Schema.Types.Mixed,

  // LLM Extraction
  extractionResult: mongoose.Schema.Types.Mixed,
  extractionSource: { type: String, enum: ['llm', 'fallback'] },
  extractionAudit: mongoose.Schema.Types.Mixed,

  // LLM Explanation + Safety
  llmOutput: mongoose.Schema.Types.Mixed,
  safetyValidation: {
    valid: Boolean,
    issues: [String]
  },
  safeOutput: mongoose.Schema.Types.Mixed,

  // Session Status Lifecycle
  status: {
    type: String,
    enum: ['active', 'extracted', 'confirmed', 'answered', 'completed', 'error'],
    default: 'active'
  },

  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TriageSession', TriageSessionSchema);
