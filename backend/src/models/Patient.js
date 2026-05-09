const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required'],
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        age: {
            type: Number,
            required: [true, 'Age is required'],
            min: [10, 'Age minimum is 10'],
            max: [60, 'Age maximum is 60'],
        },
        phone: {
            type: String,
            required: [true, 'Phone parameter is required'],
            trim: true,
        },
        trimester: {
            type: Number,
            enum: [1, 2, 3],
            required: [true, 'Trimester is required'],
        },
        gestationalWeek: {
            type: Number,
            required: [true, 'Gestational week is required'],
            min: [1, 'Gestational week minimum is 1'],
            max: [45, 'Gestational week maximum is 45'],
        },
        expectedDeliveryDate: {
            type: Date,
        },
        lastCheckupDate: {
            type: Date,
        },
        knownRiskFactors: {
            type: [String],
            default: [],
        },
        emergencyContactName: {
            type: String,
            trim: true,
        },
        emergencyContactPhone: {
            type: String,
            trim: true,
        },
        addressOrVillage: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Helpful database indexes for patient lookups
PatientSchema.index({ userId: 1 });
PatientSchema.index({ phone: 1 });

// Export safely
module.exports = mongoose.models.Patient || mongoose.model('Patient', PatientSchema);
