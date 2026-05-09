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
            enum: ['MOTHER', 'HEALTH_WORKER'],
            required: true,
            default: 'MOTHER',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for faster querying
UserSchema.index({ phone: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ email: 1 });

// Export model safely to avoid overwrite issues
module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
