const mongoose = require('mongoose');

const UploadedDocumentSchema = new mongoose.Schema({
    // --- Ownership ---
    ownerType: {
        type: String,
        enum: ['PATIENT', 'HEALTH_WORKER'],
        required: [true, 'ownerType is required'],
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, 'ownerId is required'],
    },
    uploadedByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'uploadedByUserId is required'],
    },
    relatedSessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TriageSession',
        required: false,
    },

    // --- Document metadata ---
    documentType: {
        type: String,
        required: [true, 'documentType is required'],
    },
    title: { type: String },
    description: { type: String },

    // --- File storage info ---
    originalName: { type: String },
    storedFileName: { type: String },
    storagePath: { type: String },
    mimeType: { type: String },
    sizeBytes: { type: Number },

    // --- Access & verification ---
    accessScope: { type: String },
    verificationStatus: {
        type: String,
        enum: ['NOT_REQUIRED', 'PENDING', 'VERIFIED', 'REJECTED'],
        default: 'NOT_REQUIRED',
    },
    isActive: {
        type: Boolean,
        default: true,
    },

    // --- Timestamps ---
    uploadedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    reviewedByAdminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    reviewNote: { type: String },
});

// Indexes for common lookups
UploadedDocumentSchema.index({ ownerId: 1, ownerType: 1 });
UploadedDocumentSchema.index({ uploadedByUserId: 1 });

module.exports =
    mongoose.models.UploadedDocument ||
    mongoose.model('UploadedDocument', UploadedDocumentSchema);
