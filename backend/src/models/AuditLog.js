const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    triageSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'TriageSession', required: true },
    action: { type: String, required: true },
    actorRole: { type: String, required: true }, // e.g., 'SYSTEM', 'PATIENT', 'WORKER'
    details: { type: mongoose.Schema.Types.Mixed, required: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
