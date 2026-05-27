const mongoose = require('mongoose');
const TriageSession = require('../models/TriageSession');
const AuditLog = require('../models/AuditLog');
const { logAction } = require('../services/auditService');

exports.getCases = async (req, res) => {
    try {
        const { limit = 20, skip = 0, filterMode = 'all', sortBy = 'risk', district, riskLevel, status, assignedHospitalId } = req.query;
        const pageLimit = Math.min(parseInt(limit), 100); // Max 100 per page
        const pageSkip = parseInt(skip);

        // Build search query conditions
        const filter = {};

        // 1. Regional filtering based on Worker's coverage (if restrictions apply)
        if (req.user && req.user.role === 'HEALTH_WORKER' && !req.user.canViewAllDistricts) {
            const coverage = req.user.coverageDistricts || [];
            if (coverage.length > 0) {
                const regexList = coverage.map(d => new RegExp(`^${d.trim()}$`, 'i'));
                
                // Find matching patients in coverage districts to catch legacy records
                const matchingPatients = await mongoose.model('Patient').find({
                    district: { $in: regexList }
                }).select('_id');
                const patientIds = matchingPatients.map(p => p._id);

                filter.$or = [
                    { 'profileSnapshot.district': { $in: regexList } },
                    { 'patientId': { $in: patientIds } }
                ];
            }
        }

        // 2. Explicit Query Filters
        if (district) {
            const districtRegex = new RegExp(`^${district.trim()}$`, 'i');
            
            const matchingPatients = await mongoose.model('Patient').find({
                district: districtRegex
            }).select('_id');
            const patientIds = matchingPatients.map(p => p._id);

            const districtCondition = {
                $or: [
                    { 'profileSnapshot.district': districtRegex },
                    { 'patientId': { $in: patientIds } }
                ]
            };

            if (filter.$or) {
                // If we already have $or constraints (e.g. from coverage), run both
                filter.$and = [
                    { $or: filter.$or },
                    districtCondition
                ];
                delete filter.$or;
            } else {
                filter.$or = districtCondition.$or;
            }
        }

        if (riskLevel) {
            filter['decision.riskLevel'] = riskLevel.toUpperCase();
        }

        if (status) {
            filter['status'] = status;
        }

        if (assignedHospitalId) {
            filter['assignedHospitalId'] = assignedHospitalId;
        }

        let query = TriageSession.find(filter)
            .populate('patientId')
            .populate('followUpDateSetBy', 'name');

        // Apply filterMode: 'all' or 'latest-patient'
        if (filterMode === 'latest-patient') {
            // Get latest triage for each patient under the current filters
            const matchStage = { patientId: { $ne: null } };
            // Copy top-level filter keys (like status, riskLevel, assignedHospitalId) to aggregation
            Object.keys(filter).forEach(key => {
                if (key !== '$or' && key !== '$and') {
                    matchStage[key] = filter[key];
                }
            });

            const latestPerPatient = await TriageSession.aggregate([
                { $match: matchStage },
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
            query = query.sort({ 'decision.riskLevel': 1, createdAt: -1 });
        } else {
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
            const matchStage = { patientId: { $ne: null } };
            Object.keys(filter).forEach(key => {
                if (key !== '$or' && key !== '$and') {
                    matchStage[key] = filter[key];
                }
            });
            totalCount = await TriageSession.aggregate([
                { $match: matchStage },
                { $group: { _id: '$patientId' } },
                { $count: 'total' }
            ]);
            totalCount = totalCount[0]?.total || 0;
        } else {
            totalCount = await TriageSession.countDocuments(filter);
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

exports.assignHospital = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { hospitalId, reason } = req.body;
        const workerId = req.user?._id;

        const session = await TriageSession.findById(sessionId);
        if (!session) {
            return res.status(404).json({ success: false, error: 'Case not found' });
        }

        const Hospital = require('../models/Hospital');
        const hospital = await Hospital.findById(hospitalId);
        if (!hospital) {
            return res.status(404).json({ success: false, error: 'Hospital not found' });
        }

        const actionType = session.assignedHospitalId ? 'REASSIGNED' : 'ASSIGNED';
        const previousHospitalName = session.assignedHospitalSnapshot?.name || 'None';

        // Update session details
        session.assignedHospitalId = hospital._id;
        session.assignedHospitalSnapshot = {
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
        session.assignedByWorkerId = workerId;
        session.assignedAt = new Date();

        // Add to history
        session.hospitalAssignmentHistory.push({
            hospitalId: hospital._id,
            hospitalName: hospital.name,
            assignedBy: workerId,
            assignedAt: new Date(),
            reason: reason || 'Not specified',
            action: actionType
        });

        await session.save();

        // Audit logging
        await logAction(
            sessionId,
            actionType === 'ASSIGNED' ? 'Hospital assigned' : 'Hospital reassigned',
            'WORKER',
            {
                hospitalId,
                hospitalName: hospital.name,
                previousHospitalName,
                reason: reason || 'Not specified',
                workerId
            }
        );

        res.json({ success: true, session });
    } catch (err) {
        console.error('[WorkerController] assignHospital error:', err);
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
