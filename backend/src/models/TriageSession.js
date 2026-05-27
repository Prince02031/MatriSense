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

  // Profile/location snapshot captured at triage start (safe fallback for worker screens)
  profileSnapshot: {
    name: { type: String },
    age: { type: Number },
    phone: { type: String },
    trimester: { type: String },
    gestationalWeek: { type: Number },
    expectedDeliveryDate: { type: Date },
    lastCheckupDate: { type: Date },
    knownRiskFactors: { type: mongoose.Schema.Types.Mixed },
    emergencyContactName: { type: String },
    emergencyContactPhone: { type: String },
    division: { type: String },
    district: { type: String },
    upazilaOrThana: { type: String },
    addressOrVillage: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    locationSource: { type: String }
  },

  // Hospital assignment (set manually by health worker)
  assignedHospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: false },
  assignedHospitalSnapshot: {
    name: { type: String },
    type: { type: String },
    division: { type: String },
    district: { type: String },
    upazilaOrThana: { type: String },
    address: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    phone: { type: String },
    services: { type: [String] }
  },
  assignedByWorkerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  assignedAt: { type: Date },
  hospitalAssignmentHistory: [{
    hospitalId: { type: mongoose.Schema.Types.ObjectId },
    hospitalName: { type: String },
    assignedBy: { type: mongoose.Schema.Types.ObjectId },
    assignedAt: { type: Date },
    reason: { type: String },
    action: { type: String, enum: ['ASSIGNED', 'REASSIGNED'] }
  }],

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
