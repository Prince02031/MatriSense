const ReferralNote = require('../models/ReferralNote');
const TriageSession = require('../models/TriageSession');
const { logAction } = require('../services/auditService');

exports.createNote = async (req, res) => {
    try {
        const { triageSessionId, patientId, actionTaken, referredTo, followUpDate, note, statusAfterNote } = req.body;

        if (!triageSessionId || !actionTaken || !statusAfterNote) {
            return res.status(400).json({ success: false, error: 'Required fields missing' });
        }

        const newNote = await ReferralNote.create({
            triageSessionId,
            patientId,
            // healthWorkerId: req.user._id, // Will attach if auth is in place
            actionTaken,
            referredTo,
            followUpDate,
            note,
            statusAfterNote
        });

        // Automatically update the triage session status if a new note is added with a new status
        await TriageSession.findByIdAndUpdate(triageSessionId, {
            status: statusAfterNote,
            updatedAt: Date.now()
        });

        await logAction(triageSessionId, 'Referral note added', 'WORKER', { actionTaken, referredTo });

        res.status(201).json({ success: true, note: newNote });
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

        if (!sessionId || !hospitalId) {
            return res.status(400).json({ success: false, error: 'sessionId and hospitalId are required' });
        }

        const session = await TriageSession.findById(sessionId);
        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        // Auth check: if user is PATIENT, they must own the session
        if (req.user.role === 'PATIENT') {
            const Patient = require('../models/Patient');
            const patient = await Patient.findOne({ userId: req.user._id });
            if (!patient || !session.patientId || session.patientId.toString() !== patient._id.toString()) {
                return res.status(403).json({ success: false, message: 'Not authorized to set preference for this session' });
            }
        }

        const { referral_create_patient_preference } = require('../services/referralAssistantService');
        const result = await referral_create_patient_preference({
            sessionId,
            patientId: session.patientId.toString(),
            hospitalId,
            reason,
            source: req.user.role === 'PATIENT' ? 'guided_care_assistant' : 'worker_entry'
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getReferralStatus = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await TriageSession.findById(sessionId);
        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        // Auth check
        if (req.user.role === 'PATIENT') {
            const Patient = require('../models/Patient');
            const patient = await Patient.findOne({ userId: req.user._id });
            if (!patient || !session.patientId || session.patientId.toString() !== patient._id.toString()) {
                return res.status(403).json({ success: false, message: 'Not authorized to view status for this session' });
            }
        }

        const { referral_get_referral_status } = require('../services/referralAssistantService');
        const result = await referral_get_referral_status({ sessionId });

        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getPreferences = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await TriageSession.findById(sessionId);
        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        // Auth check
        if (req.user.role === 'PATIENT') {
            const Patient = require('../models/Patient');
            const patient = await Patient.findOne({ userId: req.user._id });
            if (!patient || !session.patientId || session.patientId.toString() !== patient._id.toString()) {
                return res.status(403).json({ success: false, message: 'Not authorized to view preferences for this session' });
            }
        }

        const ReferralPreference = require('../models/ReferralPreference');
        const preferences = await ReferralPreference.find({ sessionId })
            .populate('hospitalId')
            .sort({ createdAt: -1 });

        res.json({ success: true, preferences });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.cancelPreference = async (req, res) => {
    try {
        const { preferenceId } = req.params;
        const ReferralPreference = require('../models/ReferralPreference');

        const pref = await ReferralPreference.findById(preferenceId);
        if (!pref) {
            return res.status(404).json({ success: false, error: 'Preference not found' });
        }

        // Auth check
        if (req.user.role === 'PATIENT') {
            const Patient = require('../models/Patient');
            const patient = await Patient.findOne({ userId: req.user._id });
            if (!patient || pref.patientId.toString() !== patient._id.toString()) {
                return res.status(403).json({ success: false, message: 'Not authorized to cancel this preference' });
            }
        }

        pref.status = 'CANCELLED';
        await pref.save();

        const session = await TriageSession.findById(pref.sessionId);
        if (session && session.preferredHospitalId?.toString() === pref.hospitalId.toString()) {
            session.preferredHospitalId = undefined;
            session.preferredHospitalSnapshot = undefined;
            await session.save();
        }

        await logAction(pref.sessionId, 'Patient preference cancelled', req.user.role, { preferenceId });

        res.json({ success: true, message: 'Preference cancelled successfully', preference: pref });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.acceptPreference = async (req, res) => {
    try {
        const { preferenceId } = req.params;
        const { note } = req.body;
        const workerId = req.user._id;

        if (req.user.role === 'PATIENT') {
            return res.status(403).json({ success: false, message: 'Patients cannot accept preferences' });
        }

        const ReferralPreference = require('../models/ReferralPreference');
        const pref = await ReferralPreference.findById(preferenceId);
        if (!pref) {
            return res.status(404).json({ success: false, error: 'Preference not found' });
        }

        if (pref.status !== 'PENDING_WORKER_REVIEW') {
            return res.status(400).json({ success: false, error: `Cannot accept preference in status: ${pref.status}` });
        }

        const Hospital = require('../models/Hospital');
        const hospital = await Hospital.findById(pref.hospitalId);
        if (!hospital) {
            return res.status(404).json({ success: false, error: 'Hospital not found' });
        }

        const session = await TriageSession.findById(pref.sessionId);
        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        // Update preference status
        pref.status = 'ACCEPTED';
        pref.reviewedBy = workerId;
        pref.reviewedAt = new Date();
        await pref.save();

        // Assign hospital on TriageSession
        const action = session.assignedHospitalId ? 'REASSIGNED' : 'ASSIGNED';
        const hospitalSnapshot = {
            name: hospital.name,
            type: hospital.type,
            division: hospital.division,
            district: hospital.district,
            upazilaOrThana: hospital.upazilaOrThana,
            address: hospital.address,
            latitude: hospital.latitude,
            longitude: hospital.longitude,
            phone: hospital.phone,
            services: hospital.services
        };

        if (!session.hospitalAssignmentHistory) {
            session.hospitalAssignmentHistory = [];
        }
        session.hospitalAssignmentHistory.push({
            hospitalId: hospital._id,
            hospitalName: hospital.name,
            assignedBy: workerId,
            assignedAt: new Date(),
            reason: note || pref.reason || 'Accepted patient preferred hospital',
            action
        });

        session.assignedHospitalId = hospital._id;
        session.assignedHospitalSnapshot = hospitalSnapshot;
        session.assignedByWorkerId = workerId;
        session.assignedAt = new Date();
        await session.save();

        await logAction(session._id, `Patient preference ACCEPTED. Hospital Assigned: ${hospital.name}`, 'WORKER', workerId);

        res.json({ success: true, message: 'Preference accepted and hospital assigned successfully', session });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.rejectPreference = async (req, res) => {
    try {
        const { preferenceId } = req.params;
        const { note } = req.body;
        const workerId = req.user._id;

        if (req.user.role === 'PATIENT') {
            return res.status(403).json({ success: false, message: 'Patients cannot reject preferences' });
        }

        const ReferralPreference = require('../models/ReferralPreference');
        const pref = await ReferralPreference.findById(preferenceId);
        if (!pref) {
            return res.status(404).json({ success: false, error: 'Preference not found' });
        }

        if (pref.status !== 'PENDING_WORKER_REVIEW') {
            return res.status(400).json({ success: false, error: `Cannot reject preference in status: ${pref.status}` });
        }

        pref.status = 'REJECTED';
        pref.reviewedBy = workerId;
        pref.reviewedAt = new Date();
        await pref.save();

        await logAction(pref.sessionId, `Patient preference REJECTED. Reason: ${note || 'None'}`, 'WORKER', workerId);

        res.json({ success: true, message: 'Preference rejected successfully', preference: pref });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
