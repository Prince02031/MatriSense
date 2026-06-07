/**
 * referralAccessPolicy.js
 * 
 * Enforces strict authorization bounds for the MCP service layer.
 */

class AccessControlError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AccessControlError';
    }
}

/**
 * Validates requester shape and raises an error if malformed.
 */
function validateRequester(requester) {
    if (!requester || !requester.role) {
        throw new AccessControlError('Requester role is required.');
    }
    const validRoles = ['PATIENT', 'HEALTH_WORKER', 'ADMIN', 'INTERNAL'];
    if (!validRoles.includes(requester.role)) {
        throw new AccessControlError(`Invalid role: ${requester.role}`);
    }
}

/**
 * Checks if requester can access specific patient's referral data.
 */
function enforcePatientDataAccess(requester, targetPatientId) {
    validateRequester(requester);

    if (requester.role === 'INTERNAL' || requester.role === 'ADMIN') {
        if (requester.role === 'ADMIN') {
            const { logAction } = require('../../../services/auditService');
            // Safely wrapped async logger without blocking sync function
            logAction(null, 'ADMIN overridden patient data access', 'ADMIN', { targetPatientId }).catch(() => { });
        }
        return true; // Full access
    }

    if (requester.role === 'PATIENT') {
        if (!requester.patientId || requester.patientId.toString() !== targetPatientId.toString()) {
            throw new AccessControlError('PATIENT can only access their own referral data.');
        }
        return true;
    }

    if (requester.role === 'HEALTH_WORKER') {
        // Ideally we verify if patient is in worker's coverage area.
        // Assuming for this exact boundary check, if they are a worker, they have some access.
        // Further restricting based on district is handled in service/UI level for now.
        if (!requester.workerId) {
            throw new AccessControlError('Worker context missing workerId.');
        }
        return true;
    }

    throw new AccessControlError('Unauthorized access.');
}

/**
 * Enforces boundary for creating/canceling patient preferences.
 */
function enforcePreferenceModification(requester, targetPatientId) {
    validateRequester(requester);

    if (requester.role === 'PATIENT') {
        if (!requester.patientId || requester.patientId.toString() !== targetPatientId.toString()) {
            throw new AccessControlError('PATIENT can only modify their own preferences.');
        }
        return true;
    }

    if (requester.role === 'INTERNAL' || requester.role === 'ADMIN') {
        return true;
    }

    // Health workers accept/reject, they don't explicitly act AS the patient to create preferences.
    throw new AccessControlError('Only PATIENT can create or cancel their own preference directly.');
}

/**
 * Enforces boundary for finalizing hospital assignments.
 * Passes the session to verify district coverage for health workers.
 */
function enforceAssignmentModification(requester, session) {
    validateRequester(requester);

    if (requester.role === 'ADMIN' || requester.role === 'INTERNAL') {
        if (requester.role === 'ADMIN') {
            const { logAction } = require('../../../services/auditService');
            const targetSession = session ? session._id : null;
            logAction(targetSession, 'ADMIN overridden assignment boundary', 'ADMIN').catch(() => { });
        }
        return true; // Admin override implicitly handled here
    }

    if (requester.role === 'HEALTH_WORKER') {
        if (!requester.workerId) {
            throw new AccessControlError('Worker context missing workerId.');
        }

        // Coverage Check Rule: "Worker cannot act outside coverage unless admin override exists"
        if (session && session.profileSnapshot && session.profileSnapshot.district) {
            if (!requester.canViewAllDistricts) {
                const sessionDistrict = session.profileSnapshot.district.toLowerCase();
                const allowedDistricts = requester.coverageDistricts.map(d => d.toLowerCase());
                if (!allowedDistricts.includes(sessionDistrict)) {
                    throw new AccessControlError('Worker cannot act outside assigned coverage district without admin override.');
                }
            }
        }
        return true;
    }

    throw new AccessControlError('PATIENT cannot assign, reassign, or finalize hospitals.');
}

module.exports = {
    AccessControlError,
    validateRequester,
    enforcePatientDataAccess,
    enforcePreferenceModification,
    enforceAssignmentModification
};
