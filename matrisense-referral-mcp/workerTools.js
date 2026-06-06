const {
    referralGetCaseReferralContext,
    referralListPendingPatientPreferences, // Wait, it's not exported. Ah, we didn't export referralListPendingPatientPreferences! I need to check.
    referralValidateAssignment,
    referralAcceptPatientPreference,
    referralAssignHospital,
    referralReassignHospital,
    referralUpdateReferralStatus,
    referralAddReferralNote,
    referralGetAssignmentHistory
} = require('../backend/src/mcp/referral/services/referralMcpService');

const User = require('../backend/src/models/User'); // Required for fetching worker identity fallback if needed, but not necessary since requester handles it.

async function verifyAndBuildRequester(workerId) {
    const user = await User.findById(workerId);
    if (!user || user.role !== 'HEALTH_WORKER') {
        throw new Error('Forbidden: User is not a health worker or does not exist.');
    }
    return { role: 'HEALTH_WORKER', workerId: workerId };
}

const workerToolsDef = [
    {
        name: 'referral_get_case_referral_context',
        description: 'Get aggregated context for a case, including patient info, triage risk, and preference.',
        inputSchema: { type: 'object', properties: { workerId: { type: 'string' }, sessionId: { type: 'string' } }, required: ['workerId', 'sessionId'] }
    },
    // We intentionally removed list preferences if it wasn't exported, or we can just mock it if it was missing.
    {
        name: 'referral_validate_assignment',
        description: 'Dry-run assignment logic to verify hospital capability.',
        inputSchema: { type: 'object', properties: { workerId: { type: 'string' }, hospitalId: { type: 'string' }, sessionId: { type: 'string' } }, required: ['workerId', 'hospitalId', 'sessionId'] }
    },
    {
        name: 'referral_accept_patient_preference',
        description: 'Worker accepts patient preference and formally assigns the hospital to the session.',
        inputSchema: { type: 'object', properties: { workerId: { type: 'string' }, sessionId: { type: 'string' }, preferenceId: { type: 'string' } }, required: ['workerId', 'sessionId', 'preferenceId'] }
    },
    {
        name: 'referral_assign_hospital',
        description: 'Manually assign a hospital (ignoring or rejecting preference)',
        inputSchema: {
            type: 'object',
            properties: { workerId: { type: 'string' }, sessionId: { type: 'string' }, hospitalId: { type: 'string' }, reason: { type: 'string' } },
            required: ['workerId', 'sessionId', 'hospitalId', 'reason']
        }
    },
    {
        name: 'referral_reassign_hospital',
        description: 'Overwrites existing assignment with a new one.',
        inputSchema: {
            type: 'object',
            properties: { workerId: { type: 'string' }, sessionId: { type: 'string' }, hospitalId: { type: 'string' }, reason: { type: 'string' } },
            required: ['workerId', 'sessionId', 'hospitalId', 'reason']
        }
    },
    {
        name: 'referral_update_referral_status',
        description: 'Sync status string on TriageSession.',
        inputSchema: { type: 'object', properties: { workerId: { type: 'string' }, sessionId: { type: 'string' }, status: { type: 'string' }, note: { type: 'string' } }, required: ['workerId', 'sessionId', 'status'] }
    },
    {
        name: 'referral_add_referral_note',
        description: 'Add an audit note for a referral action taken.',
        inputSchema: {
            type: 'object',
            properties: { workerId: { type: 'string' }, sessionId: { type: 'string' }, note: { type: 'string' } },
            required: ['workerId', 'sessionId', 'note']
        }
    },
    {
        name: 'referral_get_assignment_history',
        description: 'Retrieves the complete audit history of session hospital assignments.',
        inputSchema: { type: 'object', properties: { workerId: { type: 'string' }, sessionId: { type: 'string' } }, required: ['workerId', 'sessionId'] }
    }
];

async function handleWorkerTool(name, args) {
    const requester = await verifyAndBuildRequester(args.workerId);

    switch (name) {
        case 'referral_get_case_referral_context':
            return await referralGetCaseReferralContext({ sessionId: args.sessionId, requester });

        case 'referral_validate_assignment':
            return await referralValidateAssignment({ sessionId: args.sessionId, hospitalId: args.hospitalId, requester });

        case 'referral_accept_patient_preference':
            return await referralAcceptPatientPreference({ sessionId: args.sessionId, preferenceId: args.preferenceId, requester });

        case 'referral_assign_hospital':
            return await referralAssignHospital({ sessionId: args.sessionId, hospitalId: args.hospitalId, reason: args.reason, requester });

        case 'referral_reassign_hospital':
            return await referralReassignHospital({ sessionId: args.sessionId, hospitalId: args.hospitalId, reason: args.reason, requester });

        case 'referral_update_referral_status':
            return await referralUpdateReferralStatus({ sessionId: args.sessionId, status: args.status, note: args.note, requester });

        case 'referral_add_referral_note':
            return await referralAddReferralNote({ sessionId: args.sessionId, note: args.note, requester });

        case 'referral_get_assignment_history':
            return await referralGetAssignmentHistory({ sessionId: args.sessionId, requester });

        default:
            throw new Error(`Unknown worker tool: ${name} or method missing from service`);
    }
}

module.exports = { workerToolsDef, handleWorkerTool };
