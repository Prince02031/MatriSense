const TriageSession = require('../models/TriageSession');
const AuditLog = require('../models/AuditLog');
const { logAction } = require('../services/auditService');

exports.getCases = async (req, res) => {
    try {
        const { limit = 20, skip = 0, filterMode = 'all', sortBy = 'risk', district = '' } = req.query;
        const pageLimit = Math.min(parseInt(limit), 100); // Max 100 per page
        const pageSkip = parseInt(skip);

        let query = TriageSession.find()
            .populate('patientId')
            .populate('followUpDateSetBy', 'name');

        // Apply district filter if provided (case-insensitive search in profileSnapshot.district)
        if (district && district.trim()) {
            const districtRegex = new RegExp(district.trim(), 'i');
            query = query.where('profileSnapshot.district').regex(districtRegex);
        }

        // Apply filterMode: 'all' or 'latest-patient'
        if (filterMode === 'latest-patient') {
            // Get latest triage for each patient
            let match = { patientId: { $ne: null } };
            if (district && district.trim()) {
                const districtRegex = new RegExp(district.trim(), 'i');
                match['profileSnapshot.district'] = districtRegex;
            }

            const latestPerPatient = await TriageSession.aggregate([
                { $match: match },
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
        let countMatch = filterMode === 'latest-patient' ? { patientId: { $ne: null } } : {};
        if (district && district.trim()) {
            const districtRegex = new RegExp(district.trim(), 'i');
            countMatch['profileSnapshot.district'] = districtRegex;
        }

        if (filterMode === 'latest-patient') {
            totalCount = await TriageSession.aggregate([
                { $match: countMatch },
                { $group: { _id: '$patientId' } },
                { $count: 'total' }
            ]);
            totalCount = totalCount[0]?.total || 0;
        } else {
            totalCount = await TriageSession.countDocuments(countMatch);
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

// ============================================================================
// GET /api/worker/cases/:sessionId/documents
// Get patient documents related to this case
// ============================================================================
exports.getCaseDocuments = async (req, res) => {
    try {
        const { sessionId } = req.params;

        // 1. Authenticate worker access implicitly by finding the session
        const session = await TriageSession.findById(sessionId).populate('patientId');

        if (!session) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }

        if (!session.patientId) {
            return res.json({ success: true, documents: [] });
        }

        // 2. Fetch active PATIENT documents for this patient
        const UploadedDocument = require('../models/UploadedDocument');
        const docs = await UploadedDocument.find({
            ownerId: session.patientId._id,
            ownerType: 'PATIENT',
            isActive: true
        }).sort({ uploadedAt: -1 });

        // 3. Map to safe metadata
        const safeDocs = docs.map(d => ({
            _id: d._id,
            documentType: d.documentType,
            title: d.title,
            description: d.description,
            originalName: d.originalName,
            mimeType: d.mimeType,
            sizeBytes: d.sizeBytes,
            uploadedAt: d.uploadedAt
            // storagePath is intentionally EXCLUDED
        }));

        res.json({ success: true, documents: safeDocs });
    } catch (error) {
        console.error('[Worker Controller] Failed to fetch case documents:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch case documents' });
    }
};

/**
 * PUT /api/worker/cases/:sessionId/hospital
 * Assign or reassign a hospital to a triage session
 * Body: { hospitalId, reason }
 */
exports.assignHospital = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { hospitalId, reason } = req.body;
        const workerId = req.user?._id || req.body.workerId; // From auth middleware or body

        if (!hospitalId || !reason) {
            return res.status(400).json({ success: false, error: 'hospitalId and reason are required' });
        }

        // Load Hospital
        const Hospital = require('../models/Hospital');
        const hospital = await Hospital.findById(hospitalId);
        if (!hospital) {
            return res.status(404).json({ success: false, error: 'Hospital not found' });
        }

        // Load TriageSession
        const session = await TriageSession.findById(sessionId);
        if (!session) {
            return res.status(404).json({ success: false, error: 'TriageSession not found' });
        }

        // Determine if ASSIGNED or REASSIGNED
        const action = session.assignedHospitalId ? 'REASSIGNED' : 'ASSIGNED';

        // Create hospital snapshot
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

        // Append to assignment history
        if (!session.hospitalAssignmentHistory) {
            session.hospitalAssignmentHistory = [];
        }
        session.hospitalAssignmentHistory.push({
            hospitalId: hospital._id,
            hospitalName: hospital.name,
            assignedBy: workerId,
            assignedAt: new Date(),
            reason,
            action
        });

        // Update assignment fields
        session.assignedHospitalId = hospital._id;
        session.assignedHospitalSnapshot = hospitalSnapshot;
        session.assignedByWorkerId = workerId;
        session.assignedAt = new Date();

        await session.save();

        // Log audit action
        await logAction(sessionId, `Hospital ${action}: ${hospital.name}. Reason: ${reason}`, 'WORKER', workerId);

        res.json({ success: true, message: `Hospital ${action} successfully`, session });
    } catch (error) {
        console.error('[Worker Controller] Failed to assign hospital:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to assign hospital' });
    }
};
