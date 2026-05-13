const AuditLog = require('../models/AuditLog');

const logAction = async (sessionId, action, actorRole, details = {}) => {
    try {
        const log = new AuditLog({
            triageSessionId: sessionId,
            action,
            actorRole,
            details
        });
        await log.save();
    } catch (error) {
        console.error('[AuditService] Failed to log action:', error);
    }
};

module.exports = { logAction };
