'use strict';

/**
 * referralMcpService.js
 * 
 * Adapts the referral and hospital data models into strictly typed, safe
 * service functions meant for consumption by the MCP interface or internal systems.
 */

const Hospital = require('../../../models/Hospital');
const TriageSession = require('../../../models/TriageSession');
const ReferralPreference = require('../../../models/ReferralPreference');
const ReferralNote = require('../../../models/ReferralNote');
const {
    enforcePatientDataAccess,
    enforcePreferenceModification,
    enforceAssignmentModification
} = require('./referralAccessPolicy');

// --- Helpers ---

function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
}

function safeError(error, defaultMessage) {
    // Prevent returning backend stack traces or internal mongo strings
    console.error('[MCP Service Error]', error.stack || error.message);
    return new Error(error.name === 'AccessControlError' ? error.message : defaultMessage);
}

// --- Service Implementations ---

async function referralGetReferralStatus({ sessionId, patientId, requester }) {
    try {
        enforcePatientDataAccess(requester, patientId);
        const session = await TriageSession.findOne({ _id: sessionId, patientId }).lean();
        if (!session) throw new Error('Session not found');

        const preference = await ReferralPreference.findOne({ sessionId, status: 'PENDING_WORKER_REVIEW' }).lean();

        return {
            sessionId: session._id,
            referralStatus: session.status || 'UNKNOWN',
            assignedHospital: session.assignedHospitalSnapshot ? {
                hospitalId: session.assignedHospitalId,
                name: session.assignedHospitalSnapshot.name
            } : null,
            patientPreference: preference ? {
                preferenceId: preference._id,
                hospitalId: preference.hospitalId
            } : null,
            workerReviewStatus: preference ? preference.status : null,
            lastUpdatedAt: session.updatedAt
        };
    } catch (error) {
        throw safeError(error, 'Failed to fetch referral status');
    }
}

async function referralGetAssignedHospital({ sessionId, patientId, requester }) {
    try {
        enforcePatientDataAccess(requester, patientId);
        const session = await TriageSession.findOne({ _id: sessionId, patientId }).lean();
        if (!session) throw new Error('Session not found');

        if (!session.assignedHospitalId) {
            return { assigned: false, hospital: null };
        }

        const { assignedHospitalId, assignedHospitalSnapshot } = session;
        return {
            assigned: true,
            hospital: {
                hospitalId: assignedHospitalId,
                name: assignedHospitalSnapshot.name,
                district: assignedHospitalSnapshot.district,
                upazila: assignedHospitalSnapshot.upazilaOrThana,
                facilityType: assignedHospitalSnapshot.type,
                maternalServices: assignedHospitalSnapshot.services || [],
                emergencyCapability: assignedHospitalSnapshot.services?.includes('Emergency') || false,
                publicPhone: assignedHospitalSnapshot.phone
            }
        };
    } catch (error) {
        throw safeError(error, 'Failed to fetch assigned hospital');
    }
}

async function referralFindHospitalOptions(input) {
    try {
        const { sessionId, patientId, riskLevel, district, upazila, patientLocation, serviceNeeded, limit, requester } = input;
        enforcePatientDataAccess(requester, patientId);

        // Build DB Query Based on rules
        let query = { isActive: true };
        if (district) {
            query.district = new RegExp(`^${district}$`, 'i');
        }

        // Fetch hospitals
        let hospitals;
        try {
            hospitals = await Hospital.find(query).lean();
        } catch (err) {
            // Return safe fallback if DB breaks
            return { options: [], llmSummary: "Temporary issue connecting to hospital database.", safetyNote: "Please try again later." };
        }

        const risk = (riskLevel || 'LOW').toUpperCase();

        // Map & calculate distances
        let options = hospitals.map(h => {
            let isEmergency = Array.isArray(h.services) && h.services.some(s => s.toLowerCase().includes('emerg'));
            let suitabilityLevel = 1;
            let matchReason = [];

            if (risk === 'HIGH' && isEmergency) { suitabilityLevel += 2; matchReason.push('Emergency Capable'); }
            if (serviceNeeded && Array.isArray(h.services) && h.services.includes(serviceNeeded)) { suitabilityLevel += 1; matchReason.push('Matches Service Need'); }
            if (upazila && h.upazilaOrThana && h.upazilaOrThana.toLowerCase() === upazila.toLowerCase()) { suitabilityLevel += 1; matchReason.push('Same Upazila'); }

            return {
                hospitalId: h._id.toString(), // Hardened string ID
                name: h.name,
                district: h.district,
                upazila: h.upazilaOrThana,
                // UI needs lat/lng to render the map, but we keep it out of llmSummary dynamically
                lat: h.latitude,
                lng: h.longitude,
                distanceKm: h.latitude && h.longitude && patientLocation?.lat ? Math.round(calculateDistance(patientLocation.lat, patientLocation.lng, h.latitude, h.longitude)) : null,
                facilityType: h.type,
                maternalServices: h.services || [],
                emergencyCapability: isEmergency,
                publicPhone: h.phone,
                matchReason,
                suitabilityLevel
            };
        });

        // Sort by suitability descending, then distance ascending
        options.sort((a, b) => {
            if (b.suitabilityLevel !== a.suitabilityLevel) return b.suitabilityLevel - a.suitabilityLevel;
            if (a.distanceKm && b.distanceKm) return a.distanceKm - b.distanceKm;
            return 0;
        });

        if (limit) options = options.slice(0, limit);

        // Build sanitized UI and LLM structures. Never leak raw coordinates in llm summary.
        let locationSourceText = patientLocation ? "Patient's Current GPS Location" : "Matched via District Profile";
        const patientLocationSummary = patientLocation ? `District: ${district}, Lat/Lng (UI Map Only)` : `District: ${district}`;

        const safeSafetyNote = risk === 'HIGH'
            ? "CRITICAL WARNING: High risk cases require immediate medical intervention with confirmed emergency capabilities. Do not delay care waiting for preference review. Proceed to the nearest capable facility or contact emergency services if symptoms worsen."
            : "Maternal services prioritized. Wait for health worker confirmation unless symptoms change.";

        const llmSummaryOptions = options.map((o, idx) => `${idx + 1}. ${o.name} (${o.facilityType}) - District: ${o.district}`);

        return {
            riskLevel: risk,
            patientLocationSummary,
            locationSource: locationSourceText,
            options, // Coordinates stay here for UI map rendering only.
            llmSummary: `Based on your request, here are ${options.length} options:\n${llmSummaryOptions.join('\n')}`,
            safetyNote: safeSafetyNote
        };

    } catch (error) {
        throw safeError(error, 'Failed to find hospital options safely.');
    }
}

async function referralGetHospitalDetails({ hospitalId, requester }) {
    try {
        const h = await Hospital.findById(hospitalId).lean();
        if (!h) throw new Error('Hospital not found');
        return {
            hospitalId: h._id,
            name: h.name,
            district: h.district,
            upazila: h.upazilaOrThana,
            facilityType: h.type,
            maternalServices: h.services,
            publicPhone: h.phone
        };
    } catch (error) {
        throw safeError(error, 'Failed to fetch hospital details');
    }
}

async function referralCreatePatientPreference({ sessionId, patientId, hospitalId, reason, requester }) {
    try {
        enforcePreferenceModification(requester, patientId);

        // Validation - ensure hospital actually exists and is active before locking it in
        const hospital = await Hospital.findById(hospitalId).select('isActive').lean();
        if (!hospital || !hospital.isActive) {
            throw new Error('Target hospital is invalid or inactive. Please select another.');
        }

        // Prevent duplicate pending preferences natively
        const existingPending = await ReferralPreference.findOne({ sessionId, status: 'PENDING_WORKER_REVIEW' }).lean();
        if (existingPending) {
            throw new Error('A pending preference already exists for this session. Please cancel it before requesting a new one.');
        }

        const newPref = new ReferralPreference({
            sessionId,
            patientId,
            hospitalId,
            reason,
            source: requester.role === 'PATIENT' ? 'guided_care_assistant' : 'mcp',
            status: 'PENDING_WORKER_REVIEW'
        });
        await newPref.save();

        return { preferenceId: newPref._id, status: newPref.status };
    } catch (error) {
        throw safeError(error, 'Failed to create patient preference');
    }
}

async function referralCancelPatientPreference({ sessionId, patientId, preferenceId, requester }) {
    try {
        enforcePreferenceModification(requester, patientId);
        const pref = await ReferralPreference.findOneAndUpdate(
            { _id: preferenceId, sessionId, patientId, status: 'PENDING_WORKER_REVIEW' },
            { $set: { status: 'CANCELLED' } },
            { new: true }
        );
        if (!pref) throw new Error('Pending preference not found or already processed.');
        return { success: true, status: 'CANCELLED' };
    } catch (error) {
        throw safeError(error, 'Failed to cancel patient preference');
    }
}

// ----------------- WORKER/ADMIN ONLY -----------------

async function referralGetCaseReferralContext({ sessionId, requester }) {
    try {
        const session = await TriageSession.findById(sessionId).lean();
        if (!session) throw new Error('Session not found');
        enforceAssignmentModification(requester, session);

        const preference = await ReferralPreference.findOne({ sessionId }).sort({ createdAt: -1 }).lean();
        const notes = await ReferralNote.find({ triageSessionId: sessionId }).lean();

        return {
            sessionId: session._id,
            patientId: session.patientId,
            riskLevel: session.caseState?.severity || 'UNKNOWN',
            sessionStatus: session.status,
            locationSnapshot: session.profileSnapshot ? { district: session.profileSnapshot.district, upazila: session.profileSnapshot.upazilaOrThana } : null,
            preference: preference ? { hospitalId: preference.hospitalId, reason: preference.reason, status: preference.status } : null,
            assignedHospital: session.assignedHospitalSnapshot ? { hospitalId: session.assignedHospitalId, name: session.assignedHospitalSnapshot.name } : null,
            notes: notes.map(n => ({ date: n.createdAt, action: n.actionTaken, note: n.note }))
        };
    } catch (error) {
        throw safeError(error, 'Failed to fetch case referral context');
    }
}

async function referralValidateAssignment({ sessionId, hospitalId, requester }) {
    try {
        const session = await TriageSession.findById(sessionId).lean();
        enforceAssignmentModification(requester, session);
        const hospital = await Hospital.findById(hospitalId).lean();

        if (!hospital || !hospital.isActive) return { valid: false, issues: ['Hospital not found or inactive'] };

        let issues = [];
        let warnings = [];
        const risk = (session?.caseState?.severity || 'LOW').toUpperCase();

        if (risk === 'HIGH' && (!hospital.services || !hospital.services.join(' ').toLowerCase().includes('emerg'))) {
            warnings.push('Hospital lacks explicit emergency services flag.');
        } // Validate dry run logic

        return {
            valid: issues.length === 0,
            issues,
            warnings,
            riskLevel: risk,
            hospitalCapabilityMatch: hospital.services || []
        };
    } catch (error) {
        throw safeError(error, 'Failed to validate assignment');
    }
}

async function referralAcceptPatientPreference({ sessionId, preferenceId, requester }) {
    try {
        const session = await TriageSession.findById(sessionId);
        enforceAssignmentModification(requester, session);
        const pref = await ReferralPreference.findById(preferenceId);
        if (!pref || pref.status !== 'PENDING_WORKER_REVIEW') throw new Error('Preference not found or not pending');
        const hospital = await Hospital.findById(pref.hospitalId).lean();

        pref.status = 'ACCEPTED';
        pref.reviewedBy = requester.workerId || null;
        pref.reviewedAt = new Date();
        await pref.save();

        session.assignedHospitalId = hospital._id;
        session.assignedHospitalSnapshot = {
            name: hospital.name, type: hospital.type, district: hospital.district, upazilaOrThana: hospital.upazilaOrThana,
            phone: hospital.phone, services: hospital.services
        };
        session.assignedAt = new Date();
        session.assignedByWorkerId = requester.workerId || null;
        session.hospitalAssignmentHistory.push({
            hospitalId: hospital._id, hospitalName: hospital.name, assignedBy: requester.workerId || null,
            assignedAt: new Date(), reason: 'Worker accepted patient preference', action: 'ASSIGNED'
        });
        session.status = 'completed'; // Or similar final status per rules
        await session.save();

        return { success: true, assignedHospitalId: hospital._id };
    } catch (error) {
        throw safeError(error, 'Failed to accept preference');
    }
}

async function referralAssignHospital({ sessionId, hospitalId, reason, requester }) {
    try {
        const session = await TriageSession.findById(sessionId);
        enforceAssignmentModification(requester, session);
        // Similar to accept preference, except manual assignment ignores pending prefs
        await ReferralPreference.updateMany(
            { sessionId, status: 'PENDING_WORKER_REVIEW' },
            { $set: { status: 'REJECTED' } } // worker rejected it to assign a different one
        );

        const hospital = await Hospital.findById(hospitalId).lean();
        if (!hospital) throw new Error('Target hospital not found');

        session.assignedHospitalId = hospital._id;
        session.assignedHospitalSnapshot = { ...hospital };
        session.assignedAt = new Date();
        session.assignedByWorkerId = requester.workerId || null;
        session.hospitalAssignmentHistory.push({
            hospitalId: hospital._id, hospitalName: hospital.name, assignedBy: requester.workerId || null,
            assignedAt: new Date(), reason: reason || 'Manual worker assignment', action: 'ASSIGNED'
        });
        await session.save();

        return { success: true };
    } catch (error) {
        throw safeError(error, 'Failed to assign hospital');
    }
}

async function referralReassignHospital({ sessionId, hospitalId, reason, requester }) {
    try {
        const session = await TriageSession.findById(sessionId);
        enforceAssignmentModification(requester, session);
        const hospital = await Hospital.findById(hospitalId).lean();
        if (!hospital) throw new Error('Target hospital not found');

        session.assignedHospitalId = hospital._id;
        session.assignedHospitalSnapshot = { ...hospital };
        session.assignedAt = new Date();
        session.assignedByWorkerId = requester.workerId || null;
        session.hospitalAssignmentHistory.push({ // append to preserve history
            hospitalId: hospital._id, hospitalName: hospital.name, assignedBy: requester.workerId || null,
            assignedAt: new Date(), reason: reason || 'Reassigned', action: 'REASSIGNED'
        });
        await session.save();

        return { success: true };
    } catch (error) {
        throw safeError(error, 'Failed to reassign hospital');
    }
}

async function referralUpdateReferralStatus({ sessionId, status, note, requester }) {
    try {
        const session = await TriageSession.findById(sessionId);
        enforceAssignmentModification(requester, session);
        session.status = status;
        await session.save();
        return { success: true, status: session.status };
    } catch (error) {
        throw safeError(error, 'Failed to update referral status');
    }
}

async function referralAddReferralNote({ sessionId, note, actionTaken, statusAfterNote, referredTo, followUpDate, requester }) {
    try {
        const session = await TriageSession.findById(sessionId);
        if (!session) throw new Error('Session not found');
        enforceAssignmentModification(requester, session);

        const newNote = new ReferralNote({
            triageSessionId: sessionId,
            patientId: session.patientId || null,
            healthWorkerId: requester.workerId || null,
            actionTaken: actionTaken || 'MCP_NOTE_ADDED',
            referredTo: referredTo || null,
            followUpDate: followUpDate ? new Date(followUpDate) : null,
            note: note || '',
            statusAfterNote: statusAfterNote || 'UPDATED'
        });
        await newNote.save();

        // Sync to TriageSession
        const sessionUpdate = {
            status: statusAfterNote || session.status || 'UPDATED',
            updatedAt: Date.now()
        };
        if (followUpDate) {
            sessionUpdate.nextCheckupDate = new Date(followUpDate);
        }
        await TriageSession.findByIdAndUpdate(sessionId, sessionUpdate);

        // Audit Log
        const { logAction } = require('../../../services/auditService');
        await logAction(sessionId, 'Referral note added', requester.role || 'WORKER', {
            actionTaken: actionTaken || 'MCP_NOTE_ADDED',
            referredTo: referredTo || null
        });

        return { success: true, noteId: newNote._id };
    } catch (error) {
        throw safeError(error, 'Failed to add referral note');
    }
}

async function referralGetAssignmentHistory({ sessionId, requester }) {
    try {
        const session = await TriageSession.findById(sessionId).lean();
        if (!session) throw new Error('Session not found');
        enforceAssignmentModification(requester, session);
        return { history: session.hospitalAssignmentHistory || [] };
    } catch (error) {
        throw safeError(error, 'Failed to fetch assignment history');
    }
}

async function referralListPendingPatientPreferences({ requester }) {
    try {
        enforceAssignmentModification(requester);
        const prefs = await ReferralPreference.find({ status: 'PENDING_WORKER_REVIEW' }).lean();
        return {
            preferences: prefs.map(p => ({
                preferenceId: p._id,
                sessionId: p.sessionId,
                patientId: p.patientId,
                hospitalId: p.hospitalId,
                reason: p.reason,
                status: p.status,
                createdAt: p.createdAt
            }))
        };
    } catch (error) {
        throw safeError(error, 'Failed to list pending preferences');
    }
}

module.exports = {
    referralListPendingPatientPreferences,
    referralGetReferralStatus,
    referralGetAssignedHospital,
    referralFindHospitalOptions,
    referralGetHospitalDetails,
    referralCreatePatientPreference,
    referralCancelPatientPreference,
    referralGetCaseReferralContext,
    referralValidateAssignment,
    referralAcceptPatientPreference,
    referralAssignHospital,
    referralReassignHospital,
    referralUpdateReferralStatus,
    referralAddReferralNote,
    referralGetAssignmentHistory
};
