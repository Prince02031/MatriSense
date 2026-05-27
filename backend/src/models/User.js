const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
    {
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

        // Health worker regional coverage (optional, all default to empty/false)
        coverageDistricts: { type: [String], default: [] },
        coverageUpazilas: { type: [String], default: [] },
        canViewAllDistricts: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

// Indexes for faster querying
UserSchema.index({ role: 1 });

// Export model safely to avoid overwrite issues
module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
