const mongoose = require('mongoose');

const ClinicalDataPointSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient',
        required: [true, 'patientId is required'],
    },

    parameter: { type: String, required: [true, 'parameter is required'] },
    displayName: { type: String },
    displayNameBn: { type: String },
    value: { type: Number, default: null },
    unit: { type: String },
    severity: {
        type: String,
        enum: ['NORMAL', 'WARNING', 'CRITICAL', null],
        default: null,
    },
    isAbnormal: { type: Boolean, default: false },
    knownRiskFactorFlag: { type: String },

    source: {
        type: String,
        enum: ['DOCUMENT_UPLOAD', 'CHAT_SCAN'],
        required: [true, 'source is required'],
    },
    sourceDocumentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UploadedDocument',
    },
    sourceContext: { type: String },
    confidence: { type: Number },

    confirmedByPatient: { type: Boolean, default: false },
    confirmedAt: { type: Date },

    recordedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
});

ClinicalDataPointSchema.index({ patientId: 1, recordedAt: -1 });

module.exports =
    mongoose.models.ClinicalDataPoint ||
    mongoose.model('ClinicalDataPoint', ClinicalDataPointSchema);
