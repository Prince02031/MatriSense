const TriageSession = require('../models/TriageSession');
const AuditLog = require('../models/AuditLog');
const { logAction } = require('../services/auditService');

exports.getCases = async (req, res) => {
    try {
        const { limit = 20, skip = 0, filterMode = 'all', sortBy = 'risk' } = req.query;
        const pageLimit = Math.min(parseInt(limit), 100); // Max 100 per page
        const pageSkip = parseInt(skip);

        let query = TriageSession.find()
            .populate('patientId')
            .populate('followUpDateSetBy', 'name');

        // Apply filterMode: 'all' or 'latest-patient'
        if (filterMode === 'latest-patient') {
            // Get latest triage for each patient
            const latestPerPatient = await TriageSession.aggregate([
                { $match: { patientId: { $ne: null } } },
                { $sort: { createdAt: -1 } },
                { $group: { _id: '$patientId', sessionId: { $first: '$_id' } } },
                { $limit: pageLimit },
                { $skip: pageSkip }
            ]);

            const sessionIds = latestPerPatient.map(doc => doc.sessionId);
            query = TriageSession.find({ _id: { $in: sessionIds } })
                .populate('patientId')
                .populate('followUpDateSetBy', 'name');
        } else {
            query = query.skip(pageSkip).limit(pageLimit);
        }

        // Apply sorting
        if (sortBy === 'risk') {
            // Sort by risk level (HIGH > MEDIUM > LOW), then by date descending
            query = query.sort({ 'decision.riskLevel': 1, createdAt: -1 });
            // Note: MongoDB sorts strings alphabetically, so need custom sort in application
        } else {
            // Sort by date descending (newest first)
            query = query.sort({ createdAt: -1 });
        }

        let cases = await query.exec();

        // Custom sort by risk level if needed
        if (sortBy === 'risk') {
            const riskOrder = { 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3, 'UNKNOWN': 4 };
            cases = cases.sort((a, b) => {
                const riskA = riskOrder[a.decision?.riskLevel] || 4;
                const riskB = riskOrder[b.decision?.riskLevel] || 4;
                if (riskA !== riskB) return riskA - riskB;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });
        }

        // Get total count
        let totalCount;
        if (filterMode === 'latest-patient') {
            totalCount = await TriageSession.aggregate([
                { $match: { patientId: { $ne: null } } },
                { $group: { _id: '$patientId' } },
                { $count: 'total' }
            ]);
            totalCount = totalCount[0]?.total || 0;
        } else {
            totalCount = await TriageSession.countDocuments();
        }

        res.json({
            success: true,
            cases,
            pagination: {
                total: totalCount,
                limit: pageLimit,
                skip: pageSkip,
                pages: Math.ceil(totalCount / pageLimit)
            }
        });
    } catch (err) {
        console.error('[WorkerController] getCases error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getCaseDetail = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await TriageSession.findById(sessionId)
            .populate('patientId')
            .populate('followUpDateSetBy', 'name');

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
        ).populate('patientId').populate('followUpDateSetBy', 'name');

        if (!session) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }

        await logAction(sessionId, 'Status updated', 'WORKER', { status });

        res.json({ success: true, session });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.setFollowUpDate = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { nextCheckupDate, workerId } = req.body;

        if (!nextCheckupDate) {
            return res.status(400).json({ success: false, error: 'Follow-up date is required' });
        }

        const session = await TriageSession.findByIdAndUpdate(
            sessionId,
            {
                nextCheckupDate: new Date(nextCheckupDate),
                followUpDateSetBy: workerId,
                updatedAt: Date.now()
            },
            { new: true }
        ).populate('patientId').populate('followUpDateSetBy', 'name');

        if (!session) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }

        await logAction(sessionId, 'Follow-up date set', 'WORKER', { nextCheckupDate, workerId });

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
