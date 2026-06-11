const TriageSession = require('../models/TriageSession');
const AuditLog = require('../models/AuditLog');
const { logAction } = require('../services/auditService');

exports.getCases = async (req, res) => {
    console.log('\n[FETCH SOURCE] Requesting Patient List from SERVER (Database)');
    try {
        const { limit = 20, skip = 0, filterMode = 'all', sortBy = 'risk', district = '' } = req.query;
        const pageLimit = Math.min(parseInt(limit), 100); // Max 100 per page
        const pageSkip = parseInt(skip);

        const inProgressStatuses = ['active', 'extracted', 'confirmed', 'answered'];

        let query = TriageSession.find({ status: { $nin: inProgressStatuses } })
            .populate('patientId')
            .populate('followUpDateSetBy', 'name');

        // Apply district filter if provided (case-insensitive search in profileSnapshot.district)
        if (district && district.trim()) {
            const districtRegex = new RegExp(district.trim(), 'i');
            query = query.where('profileSnapshot.district').regex(districtRegex);
        }

        // Apply filterMode: 'all' or 'latest-patient'
        if (filterMode === 'latest-patient') {
            // Get latest completed triage for each patient
            let match = { patientId: { $ne: null }, status: { $nin: inProgressStatuses } };
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
        let countMatch = filterMode === 'latest-patient'
            ? { patientId: { $ne: null }, status: { $nin: inProgressStatuses } }
            : { status: { $nin: inProgressStatuses } };
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

        // Check patient consent for sharing with health workers
        const Patient = require('../models/Patient');
        const patient = await Patient.findById(session.patientId._id);
        if (!patient || !patient.consentToShareWithHealthWorker) {
            return res.json({
                success: true,
                documents: [],
                consentDenied: true,
                message: 'Patient has not granted consent to share documents with health workers.'
            });
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

        const { referral_assign_hospital } = require('../services/referralAssistantService');

        const result = await referral_assign_hospital({
            sessionId,
            hospitalId,
            workerId: workerId ? workerId.toString() : null,
            reason
        });

        res.json(result);
    } catch (error) {
        console.error('[Worker Controller] Failed to assign hospital:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to assign hospital' });
    }
};
/**
 * POST /api/worker/cases/:sessionId/request-gps
 * Health worker requests GPS location from patient.
 * Sets gpsRequested flag on the triage session.
 */
exports.requestGPS = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await TriageSession.findByIdAndUpdate(
            sessionId,
            {
                gpsRequested: true,
                gpsRequestedAt: new Date(),
                updatedAt: Date.now()
            },
            { new: true }
        );

        if (!session) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }

        await logAction(sessionId, 'GPS location requested from patient', 'WORKER');

        res.json({ success: true, message: 'GPS request sent to patient' });
    } catch (err) {
        console.error('[WorkerController] requestGPS error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * POST /api/worker/cases/:sessionId/deliver-referral
 * Health worker delivers a referral to patient dashboard.
 * Creates a Referral record and logs action in audit timeline.
 */
exports.deliverReferral = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { hospitalId, reason } = req.body;
        const Referral = require('../models/Referral');

        if (!hospitalId || !reason) {
            return res.status(400).json({ success: false, error: 'hospitalId and reason are required' });
        }

        const session = await TriageSession.findById(sessionId);
        if (!session) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }

        if (!session.patientId) {
            return res.status(400).json({ success: false, error: 'Triage session has no associated patient' });
        }

        // Create the referral record
        const referral = await Referral.create({
            triageSessionId: sessionId,
            patientId: session.patientId,
            hospitalId,
            reason,
            deliveredAt: new Date()
        });

        // Audit the delivery action
        await logAction(sessionId, `Referral delivered to patient for hospital: ${hospitalId}`, 'WORKER', { hospitalId, reason });

        res.status(201).json({ success: true, referralId: referral._id });
    } catch (error) {
        console.error('[Worker Controller] Failed to deliver referral:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to deliver referral' });
    }
};

/**
 * Simple logging endpoint for frontend to report fetch source in backend terminal
 */
exports.logFetchSource = (req, res) => {
    const { source } = req.query;
    console.log(`\n[FETCH SOURCE] Patient List loaded from ${source?.toUpperCase() || 'UNKNOWN'}`);
    res.status(200).json({ success: true });
};
