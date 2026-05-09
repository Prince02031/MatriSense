const mongoose = require('mongoose');

const TriageSessionSchema = new mongoose.Schema(
    {
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
            required: [true, 'Patient ID is required'],
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required'],
        },
        // Store patient profile snapshot at session start
        profileSnapshot: {
            type: Object,
            required: [true, 'Profile snapshot is required'],
        },
        // Original Bangla symptom description entered by mother
        initialInputBn: {
            type: String,
            required: [true, 'Initial Bangla input is required'],
        },
        // Duration in seconds
        duration: {
            type: Number,
            default: 0,
        },
        severity: {
            type: String,
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            default: 'LOW',
        },
        checkedDangerSigns: {
            type: [String],
            default: [],
        },
        status: {
            type: String,
            enum: ['STARTED', 'IN_PROGRESS', 'COMPLETED', 'ESCALATED'],
            default: 'STARTED',
        },
    },
    {
        timestamps: true,
    }
);

// Helpful indexes as requested
TriageSessionSchema.index({ patientId: 1 });
TriageSessionSchema.index({ userId: 1 });
TriageSessionSchema.index({ status: 1 });
TriageSessionSchema.index({ createdAt: -1 });

// Export safely
module.exports = mongoose.models.TriageSession || mongoose.model('TriageSession', TriageSessionSchema);
