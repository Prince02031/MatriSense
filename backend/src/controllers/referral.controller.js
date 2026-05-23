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
