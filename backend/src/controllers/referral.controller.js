const ReferralNote = require('../models/ReferralNote');
const TriageSession = require('../models/TriageSession');
const ReferralPreference = require('../models/ReferralPreference');
const Patient = require('../models/Patient');
const Hospital = require('../models/Hospital');
const { logAction } = require('../services/auditService');

const {
    referralAcceptPatientPreference,
    referralAssignHospital,
    referralReassignHospital,
    referralAddReferralNote,
    referralUpdateReferralStatus,
    referralGetAssignmentHistory,
    referralCreatePatientPreference,
    referralGetReferralStatus,
    referralCancelPatientPreference
} = require('../mcp/referral/services/referralMcpService');

async function getRequester(req) {
    let patientId = undefined;
    if (req.user.role === 'PATIENT') {
        const patient = await Patient.findOne({ userId: req.user._id });
        if (patient) patientId = patient._id.toString();
    }
    return {
        role: req.user.role,
        patientId,
        workerId: req.user.role === 'HEALTH_WORKER' ? req.user._id.toString() : undefined,
        coverageDistricts: req.user.coverageDistricts || [],
        canViewAllDistricts: req.user.canViewAllDistricts || false
    };
}

exports.createNote = async (req, res) => {
    try {
        const { triageSessionId, patientId, actionTaken, referredTo, followUpDate, note, statusAfterNote } = req.body;
        const requester = await getRequester(req);

        const result = await referralAddReferralNote({
            sessionId: triageSessionId,
            note: note || `Action: ${actionTaken} -> Status: ${statusAfterNote}`,
            actionTaken,
            statusAfterNote,
            referredTo,
            followUpDate,
            requester
        });

        res.status(201).json({ success: true, noteId: result.noteId });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getNotesForSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const notes = await ReferralNote.find({ triageSessionId: sessionId }).sort({ createdAt: -1 });
        res.json({ success: true, notes });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.createPatientPreference = async (req, res) => {
    try {
        const { sessionId, hospitalId, reason } = req.body;
        const requester = await getRequester(req);
        const result = await referralCreatePatientPreference({ sessionId, patientId: requester.patientId, hospitalId, reason, requester });
        res.json({ success: true, preferenceId: result.preferenceId, status: result.status });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getReferralStatus = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const requester = await getRequester(req);
        const result = await referralGetReferralStatus({ sessionId, patientId: requester.patientId, requester });
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getPreferences = async (req, res) => {
    try {
        const { sessionId } = req.params;
        // Verify via session read, then pull standard list.
        const session = await TriageSession.findById(sessionId);
        if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

        const preferences = await ReferralPreference.find({ sessionId }).populate('hospitalId').sort({ createdAt: -1 });
        res.json({ success: true, preferences });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.cancelPreference = async (req, res) => {
    try {
        const { preferenceId } = req.params;
        const pref = await ReferralPreference.findById(preferenceId);
        if (!pref) throw new Error("Pref missing");

        const requester = await getRequester(req);
        await referralCancelPatientPreference({ sessionId: pref.sessionId, patientId: requester.patientId, preferenceId, requester });
        res.json({ success: true, message: 'Preference cancelled successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.acceptPreference = async (req, res) => {
    try {
        const { preferenceId } = req.params;
        const pref = await ReferralPreference.findById(preferenceId);
        if (!pref) throw new Error("Pref missing");

        const requester = await getRequester(req);
        const result = await referralAcceptPatientPreference({ sessionId: pref.sessionId, preferenceId, requester });
        res.json({ success: true, message: 'Preference accepted and hospital assigned successfully', assignedHospitalId: result.assignedHospitalId });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.rejectPreference = async (req, res) => {
    try {
        const { preferenceId } = req.params;
        const { note } = req.body;
        const requester = await getRequester(req);

        if (requester.role === 'PATIENT') return res.status(403).json({ success: false, message: 'Patients cannot reject preferences' });

        const pref = await ReferralPreference.findById(preferenceId);
        if (!pref) return res.status(404).json({ success: false, error: 'Preference not found' });

        if (pref.status !== 'PENDING_WORKER_REVIEW') return res.status(400).json({ success: false, error: `Cannot reject preference in status: ${pref.status}` });

        pref.status = 'REJECTED';
        pref.reviewedBy = requester.workerId;
        pref.reviewedAt = new Date();
        await pref.save();

        await logAction(pref.sessionId, `Patient preference REJECTED. Reason: ${note || 'None'}`, 'WORKER', requester.workerId);

        res.json({ success: true, message: 'Preference rejected successfully', preference: pref });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.assignHospital = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { hospitalId, reason } = req.body;
        const requester = await getRequester(req);

        const session = await TriageSession.findById(sessionId);
        let result;
        if (session && session.assignedHospitalId) {
            result = await referralReassignHospital({ sessionId, hospitalId, reason, requester });
        } else {
            result = await referralAssignHospital({ sessionId, hospitalId, reason, requester });
        }

        res.json({ success: true, message: 'Hospital assigned successfully', result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.reassignHospital = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { hospitalId, reason } = req.body;
        const requester = await getRequester(req);

        const result = await referralReassignHospital({ sessionId, hospitalId, reason, requester });
        res.json({ success: true, message: 'Hospital reassigned successfully', result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateReferralStatus = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { status, note } = req.body;
        const requester = await getRequester(req);

        const result = await referralUpdateReferralStatus({ sessionId, status, note, requester });
        res.json({ success: true, status: result.status });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getAssignmentHistory = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const requester = await getRequester(req);

        const result = await referralGetAssignmentHistory({ sessionId, requester });
        res.json({ success: true, history: result.history });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * GET /api/patient/referrals
 * Get list of referrals delivered to the patient dashboard
 */
exports.getPatientReferrals = async (req, res) => {
    try {
        const Patient = require('../models/Patient');
        const Referral = require('../models/Referral');

        // Find patient profile for the logged in user
        const patient = await Patient.findOne({ userId: req.user._id });
        if (!patient) {
            return res.json({ success: true, referrals: [], notificationCount: 0 });
        }

        // Fetch all referrals, populating hospital information
        const referrals = await Referral.find({ patientId: patient._id })
            .populate('hospitalId')
            .sort({ deliveredAt: -1 });

        // Filter out referrals with missing/deleted hospitals
        const validReferrals = referrals.filter(r => r.hospitalId !== null);

        const formatted = validReferrals.map(r => ({
            _id: r._id,
            hospitalName: r.hospitalId?.name || 'Unknown Hospital',
            hospitalType: r.hospitalId?.type || 'N/A',
            hospitalAddress: r.hospitalId?.address || 'N/A',
            hospitalPhone: r.hospitalId?.phone || '',
            hospitalServices: r.hospitalId?.services || [],
            reason: r.reason,
            deliveredAt: r.deliveredAt,
            readAt: r.readAt,
            acknowledgedAt: r.acknowledgedAt
        }));

        const notificationCount = validReferrals.filter(r => !r.readAt).length;

        res.json({ success: true, referrals: formatted, notificationCount });
    } catch (error) {
        console.error('[Referral Controller] Failed to get patient referrals:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to fetch referrals' });
    }
};

/**
 * PUT /api/patient/referrals/:referralId/read
 * Mark a referral as read
 */
exports.markReferralAsRead = async (req, res) => {
    try {
        const Patient = require('../models/Patient');
        const Referral = require('../models/Referral');

        const patient = await Patient.findOne({ userId: req.user._id });
        if (!patient) {
            return res.status(404).json({ success: false, error: 'Patient profile not found' });
        }

        const referral = await Referral.findOneAndUpdate(
            { _id: req.params.referralId, patientId: patient._id },
            { readAt: new Date() },
            { new: true }
        );

        if (!referral) {
            return res.status(404).json({ success: false, error: 'Referral not found or unauthorized' });
        }

        res.json({ success: true, message: 'Referral marked as read' });
    } catch (error) {
        console.error('[Referral Controller] Failed to mark referral as read:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to mark read' });
    }
};

/**
 * PUT /api/patient/referrals/:referralId/acknowledge
 * Acknowledge referral by patient
 */
exports.acknowledgeReferral = async (req, res) => {
    try {
        const Patient = require('../models/Patient');
        const Referral = require('../models/Referral');
        const { logAction } = require('../services/auditService');

        const patient = await Patient.findOne({ userId: req.user._id });
        if (!patient) {
            return res.status(404).json({ success: false, error: 'Patient profile not found' });
        }

        const referral = await Referral.findOneAndUpdate(
            { _id: req.params.referralId, patientId: patient._id },
            { acknowledgedAt: new Date(), readAt: new Date() }, // Auto mark read if acknowledged
            { new: true }
        );

        if (!referral) {
            return res.status(404).json({ success: false, error: 'Referral not found or unauthorized' });
        }

        // Log audit action for patient acknowledging referral
        await logAction(referral.triageSessionId, 'Referral acknowledged by patient', 'PATIENT', { referralId: referral._id });

        res.json({ success: true, message: 'Referral acknowledged successfully' });
    } catch (error) {
        console.error('[Referral Controller] Failed to acknowledge referral:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to acknowledge referral' });
    }
};
