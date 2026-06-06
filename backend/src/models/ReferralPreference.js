/**
 * ReferralPreference.js
 *
 * Tracks patient hospital preferences expressed via the Guided Care Assistant.
 *
 * SAFETY RULES:
 * - Status starts at PENDING_WORKER_REVIEW — never auto-accepted.
 * - Does NOT replace the worker-assigned hospital on TriageSession.
 * - Health workers review this on the case detail screen before finalizing.
 */
'use strict';

const mongoose = require('mongoose');

const ReferralPreferenceSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TriageSession',
    required: true,
    index: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  reason: {
    type: String,
    required: false,
    trim: true
  },
  source: {
    type: String,
    default: 'guided_care_assistant',
    trim: true
  },
  status: {
    type: String,
    enum: ['PENDING_WORKER_REVIEW', 'ACCEPTED', 'REJECTED', 'REASSIGNED', 'CANCELLED'],
    default: 'PENDING_WORKER_REVIEW'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  reviewedAt: {
    type: Date,
    required: false
  }
});

module.exports = mongoose.model('ReferralPreference', ReferralPreferenceSchema);
