const TriageSession = require('../models/TriageSession');
const AuditLog = require('../models/AuditLog');
const { logAction } = require('../services/auditService');

exports.getCases = async (req, res) => {
    try {
        // Return all cases sorted by creation date descending
        const cases = await TriageSession.find()
            .populate('patientId')
            .sort({ createdAt: -1 });

        res.json({ success: true, cases });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getCaseDetail = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await TriageSession.findById(sessionId)
            .populate('patientId');

        if (!session) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }

        await logAction(sessionId, 'Case viewed', 'WORKER');

        res.json({ success: true, session });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, error: 'Status is required' });
        }

        const session = await TriageSession.findByIdAndUpdate(
            sessionId,
            { status, updatedAt: Date.now() },
            { new: true }
        );

        if (!session) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }

        await logAction(sessionId, 'Status updated', 'WORKER', { status });

        res.json({ success: true, session });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getAuditLogs = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const logs = await AuditLog.find({ triageSessionId: sessionId })
            .sort({ createdAt: 1 });

        res.json({ success: true, logs });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
