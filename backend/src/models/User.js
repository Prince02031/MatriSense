const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
    {
        // --- Core auth fields (unchanged) ---
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        phone: {
            type: String,
            required: [true, 'Phone number is required'],
            unique: true,
            trim: true,
        },
        email: {
            type: String,
            required: false,
            unique: true,
            sparse: true,
            lowercase: true,
            trim: true,
        },
        passwordHash: {
            type: String,
            required: [true, 'Password hash is required'],
        },
        role: {
            type: String,
            enum: ['MOTHER', 'HEALTH_WORKER', 'ADMIN'],
            required: true,
            default: 'MOTHER',
        },
        isActive: {
            type: Boolean,
            default: true,
        },

        // --- Health-worker professional fields (all optional) ---
        professionalTitle: { type: String, trim: true },
        organizationName: { type: String, trim: true },
        workplaceName: { type: String, trim: true },
        registrationNumber: { type: String, trim: true },
        certificationType: { type: String, trim: true },
        yearsOfExperience: { type: Number },
        coverageDistricts: { type: [String], default: undefined },
        coverageUpazilas: { type: [String], default: undefined },

        // --- Certification / verification lifecycle ---
        certificationStatus: {
            type: String,
            enum: ['MISSING', 'PENDING', 'VERIFIED', 'REJECTED'],
            default: 'MISSING',
        },
        certificationSubmittedAt: { type: Date },
        verifiedAt: { type: Date },
        verifiedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        verificationNote: { type: String },
    },
    {
        timestamps: true,
    }
);

// Indexes for faster querying
UserSchema.index({ role: 1 });

// Export model safely to avoid overwrite issues
module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
