const Patient = require('../../../models/Patient');

/**
 * Validates if the authenticated user has access to a specific triage session.
 * Always rejects ADMIN role per MCP safety policy.
 */
const canViewPatientSession = async (user, session) => {
    if (!user || user.role === 'ADMIN') return false;

    if (user.role === 'MOTHER' || user.role === 'PATIENT') {
        if (!session.patientId) return false;
        const patientRecord = await Patient.findOne({ userId: user._id });
        if (!patientRecord) return false;
        return session.patientId.toString() === patientRecord._id.toString();
    }

    if (user.role === 'HEALTH_WORKER') {
        // Depending on coverage mapping, but generally allowed to see cases
        // Could verify session mapped district vs user.coverageDistricts here
        return true;
    }

    return false;
};

module.exports = { canViewPatientSession };
