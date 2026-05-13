const mongoose = require('mongoose');

const ReferralNoteSchema = new mongoose.Schema({
  triageSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'TriageSession', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: false },
  healthWorkerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // if we link to a worker
  actionTaken: { type: String, required: true }, // e.g., 'URGENT_REFERRAL', 'CONTACTED'
  referredTo: { type: String, required: false }, // clinic or hospital name
  followUpDate: { type: Date, required: false },
  note: { type: String, required: false },
  statusAfterNote: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ReferralNote', ReferralNoteSchema);
