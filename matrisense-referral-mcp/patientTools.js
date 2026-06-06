const {
    referralGetReferralStatus,
    referralGetAssignedHospital,
    referralFindHospitalOptions,
    referralGetHospitalDetails,
    referralCreatePatientPreference,
    referralCancelPatientPreference
} = require('../backend/src/mcp/referral/services/referralMcpService');

const patientToolsDef = [
    {
        name: 'referral_get_referral_status',
        description: 'Get current referral status for a patient triage session. Safe for patient access.',
        inputSchema: {
            type: 'object',
            properties: { sessionId: { type: 'string' }, patientId: { type: 'string' } },
            required: ['sessionId', 'patientId']
        }
    },
    {
        name: 'referral_get_assigned_hospital',
        description: 'Get details of the assigned hospital for a session.',
        inputSchema: {
            type: 'object',
            properties: { sessionId: { type: 'string' }, patientId: { type: 'string' } },
            required: ['sessionId', 'patientId']
        }
    },
    {
        name: 'referral_find_hospital_options',
        description: 'Find active hospitals based on district, upazila, and patient coordinates.',
        inputSchema: {
            type: 'object',
            properties: {
                sessionId: { type: 'string' },
                patientId: { type: 'string' },
                riskLevel: { type: 'string' },
                district: { type: 'string' },
                upazila: { type: 'string' },
                patientLat: { type: 'number' },
                patientLng: { type: 'number' },
                serviceNeeded: { type: 'string' },
                limit: { type: 'number' }
            },
            required: ['district', 'patientId', 'sessionId']
        }
    },
    {
        name: 'referral_get_hospital_details',
        description: 'Get public metrics of a hospital.',
        inputSchema: {
            type: 'object',
            properties: { hospitalId: { type: 'string' }, patientId: { type: 'string' } },
            required: ['hospitalId', 'patientId']
        }
    },
    {
        name: 'referral_create_patient_preference',
        description: 'Create a hospital preference for a patient.',
        inputSchema: {
            type: 'object',
            properties: {
                sessionId: { type: 'string' },
                patientId: { type: 'string' },
                hospitalId: { type: 'string' },
                reason: { type: 'string' }
            },
            required: ['sessionId', 'patientId', 'hospitalId', 'reason']
        }
    },
    {
        name: 'referral_cancel_patient_preference',
        description: 'Cancel a pending hospital preference.',
        inputSchema: {
            type: 'object',
            properties: { sessionId: { type: 'string' }, preferenceId: { type: 'string' }, patientId: { type: 'string' } },
            required: ['sessionId', 'preferenceId', 'patientId']
        }
    }
];

async function handlePatientTool(name, args) {
    const requester = { role: 'PATIENT', patientId: args.patientId };

    switch (name) {
        case 'referral_get_referral_status':
            return await referralGetReferralStatus({
                sessionId: args.sessionId, patientId: args.patientId, requester
            });

        case 'referral_get_assigned_hospital':
            return await referralGetAssignedHospital({
                sessionId: args.sessionId, patientId: args.patientId, requester
            });

        case 'referral_find_hospital_options':
            return await referralFindHospitalOptions({
                sessionId: args.sessionId,
                patientId: args.patientId,
                riskLevel: args.riskLevel,
                district: args.district,
                upazila: args.upazila,
                patientLocation: (args.patientLat && args.patientLng) ? { lat: args.patientLat, lng: args.patientLng } : undefined,
                serviceNeeded: args.serviceNeeded,
                limit: args.limit,
                requester
            });

        case 'referral_get_hospital_details':
            return await referralGetHospitalDetails({
                hospitalId: args.hospitalId, requester
            });

        case 'referral_create_patient_preference':
            return await referralCreatePatientPreference({
                sessionId: args.sessionId,
                patientId: args.patientId,
                hospitalId: args.hospitalId,
                reason: args.reason,
                requester
            });

        case 'referral_cancel_patient_preference':
            return await referralCancelPatientPreference({
                sessionId: args.sessionId,
                patientId: args.patientId,
                preferenceId: args.preferenceId,
                requester
            });

        default:
            throw new Error(`Unknown patient tool: ${name}`);
    }
}

module.exports = { patientToolsDef, handlePatientTool };
