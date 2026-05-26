const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  // --- Core / existing fields (unchanged) ---
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  name: { type: String, required: true },
  age: { type: Number, required: true },
  phone: { type: String, required: false },
  trimester: { type: String, required: true },
  gestationalWeek: { type: Number, required: false },
  expectedDeliveryDate: { type: Date, required: false },
  lastCheckupDate: { type: Date, required: false },
  knownRiskFactors: { type: mongoose.Schema.Types.Mixed, default: {} },
  emergencyContactName: { type: String, required: false },
  emergencyContactPhone: { type: String, required: false },
  addressOrVillage: { type: String, required: false },

  // --- Identity fields (all optional, never forced on old records) ---
  email: { type: String, required: false, trim: true, lowercase: true },
  nationalIdNumber: { type: String, required: false, trim: true },
  birthCertificateNumber: { type: String, required: false, trim: true },

  // --- Consent flags (default false — opt-in only) ---
  consentToShareWithHealthWorker: { type: Boolean, default: false },
  consentToUseLocationForReferral: { type: Boolean, default: false },
  consentToStoreDocuments: { type: Boolean, default: false },

  // --- Location fields (all optional, for referral support) ---
  division: { type: String, required: false },
  district: { type: String, required: false },
  upazilaOrThana: { type: String, required: false },
  latitude: { type: Number, required: false },
  longitude: { type: Number, required: false },
  locationSource: { type: String, required: false },

  // --- Timestamps (unchanged) ---
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Patient', PatientSchema);
