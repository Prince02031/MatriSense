const TriageSession = require('../../../models/TriageSession');
const Patient = require('../../../models/Patient');
const User = require('../../../models/User');

const resolvePatientIdFromRequester = async (requester) => {
    if (!requester || !requester.id) return null;
    const patientRecord = await Patient.findOne({ userId: requester.id });
    return patientRecord ? patientRecord._id.toString() : null;
};

const canAccessPatient = async (requester, targetPatientId) => {
    if (!requester || !requester.role) return false;
    if (requester.role === 'INTERNAL' || requester.role === 'ADMIN') return true;

    const strTarget = targetPatientId.toString();

    if (requester.role === 'PATIENT' || requester.role === 'MOTHER') {
        const myPatientId = await resolvePatientIdFromRequester(requester);
        return myPatientId === strTarget;
    }

    if (requester.role === 'HEALTH_WORKER') {
        if (!requester.id) return false; // Must provide worker ID to isolate
        const worker = await User.findById(requester.id);
        if (worker && worker.canViewAllDistricts) return true;

        const patient = await Patient.findById(targetPatientId);
        if (!patient) return false;

        // Strict worker coverage check
        const workerDistricts = worker?.coverageDistricts || [];
        if (workerDistricts.length > 0 && patient.district) {
            return workerDistricts.includes(patient.district);
        }

        return false;
    }

    return false;
};

const canAccessSession = async (requester, session) => {
    if (!requester || !requester.role) return false;
    if (requester.role === 'INTERNAL' || requester.role === 'ADMIN') return true;
    if (!session) return false;

    if (requester.role === 'PATIENT' || requester.role === 'MOTHER') {
        if (!session.patientId) return false;
        const myPatientId = await resolvePatientIdFromRequester(requester);
        return myPatientId === session.patientId.toString();
    }

    if (requester.role === 'HEALTH_WORKER') {
        if (!requester.id) return false;

        // Allowed if worker assigned it:
        if (session.assignedByWorkerId?.toString() === requester.id) return true;

        // Fallback to district coverage mapping:
        if (session.patientId) return await canAccessPatient(requester, session.patientId);

        return false;
    }

    return false;
};

const requiresWorkerOrAdmin = (requester) => {
    return requester && (requester.role === 'HEALTH_WORKER' || requester.role === 'ADMIN' || requester.role === 'INTERNAL');
};

module.exports = {
    canAccessPatient,
    canAccessSession,
    requiresWorkerOrAdmin
};
