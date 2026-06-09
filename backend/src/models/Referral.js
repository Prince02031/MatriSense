const mongoose = require('mongoose');

const ReferralSchema = new mongoose.Schema({
  triageSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'TriageSession', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  reason: { type: String, required: true },
  deliveredAt: { type: Date, default: Date.now },
  readAt: { type: Date },
  acknowledgedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Referral', ReferralSchema);
