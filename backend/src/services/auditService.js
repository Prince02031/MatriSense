const AuditLog = require('../models/AuditLog');

const logAction = async (sessionId, action, actorRole, details = {}, userId = null) => {
    try {
        const log = new AuditLog({
            triageSessionId: sessionId || undefined,
            userId: userId || undefined,
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
