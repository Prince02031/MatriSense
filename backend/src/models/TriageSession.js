const mongoose = require('mongoose');

const TriageSessionSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: false },
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

  // Follow-up Management
  nextCheckupDate: { type: Date, required: false },
  followUpDateSetBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },

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
