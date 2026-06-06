const TriageSession = require('../../../models/TriageSession');
const Patient = require('../../../models/Patient');
const UploadedDocument = require('../../../models/UploadedDocument');
const { canAccessPatient, canAccessSession, requiresWorkerOrAdmin } = require('./caseAccessPolicy');

const getDocumentSummary = async (patientId, sessionId = null) => {
    const query = { ownerType: 'PATIENT', ownerId: patientId };
    if (sessionId) query.relatedSessionId = sessionId;

    try {
        const documents = await UploadedDocument.find(query).select('documentType isActive');
        const activeDocs = documents.filter(d => d.isActive);
        const types = [...new Set(activeDocs.map(d => d.documentType))];
        const patient = await Patient.findById(patientId).select('consentToStoreDocuments');

        return {
            documentsUploaded: activeDocs.length > 0,
            documentTypes: types,
            documentCount: activeDocs.length,
            consentProvided: patient?.consentToStoreDocuments || false
        };
    } catch {
        return {
            documentsUploaded: false,
            documentTypes: [],
            documentCount: 0,
            consentProvided: false
        };
    }
};

const categorizeAge = (age) => {
    if (!age) return 'UNKNOWN';
    if (age < 18) return 'UNDER_18';
    if (age >= 18 && age <= 35) return '18_TO_35';
    return 'OVER_35';
};

const getTriageProfileContext = async ({ patientId, sessionId, requester }) => {
    try {
        const pId = patientId || (sessionId ? (await TriageSession.findById(sessionId))?.patientId : null);
        if (!pId) return null;
        if (!(await canAccessPatient(requester, pId))) return null;

        const patient = await Patient.findById(pId);
        if (!patient) return null;

        let lastCheckupGapDays = null;
        if (patient.lastCheckupDate) {
            lastCheckupGapDays = Math.max(0, Math.ceil(Math.abs(new Date() - new Date(patient.lastCheckupDate)) / (1000 * 60 * 60 * 24)));
        }

        const docSummary = await getDocumentSummary(pId);

        return {
            patientId: pId,
            trimester: patient.trimester || null,
            gestationalWeek: patient.gestationalWeek || null,
            gestationalWeekEstimated: false, // Could be derived based on EDD
            gestationalWeekSource: 'patient_profile',
            ageGroup: categorizeAge(patient.age),
            knownRiskFactors: patient.knownRiskFactors || {},
            lastCheckupGapDays,
            district: patient.district || null,
            upazila: patient.upazilaOrThana || null,
            recentRiskSummary: "N/A", // Handled by other summary systems
            profileEvidenceTags: [],
            documentUploadSummary: docSummary
        };
    } catch (e) {
        return null; // Return cleanly without stack traces
    }
};

const getCurrentTriage = async ({ sessionId, requester }) => {
    try {
        const session = await TriageSession.findById(sessionId);
        if (!session) return null;
        if (!(await canAccessSession(requester, session))) return null;

        const caseState = session.caseState || {};
        const isCompleted = ['completed', 'answered', 'VIEWED', 'RESOLVED', 'REFERRED'].includes(session.status);

        return {
            sessionId: session._id,
            patientId: session.patientId,
            riskLevel: session.decision?.riskLevel || 'UNKNOWN',
            symptoms: session.confirmedSymptoms?.length ? session.confirmedSymptoms : (caseState.symptoms || []),
            severity: caseState.severity || {},
            duration: caseState.duration || {},
            negations: caseState.dangerSignsChecked || [],
            followUpAnswers: caseState.followUpAnswers || {},
            matchedRules: isCompleted ? (session.decision?.matchedRules || []) : [],
            evidenceTags: session.careGuidanceContext?.tags || [],
            allowedGuidanceType: session.decision?.recommendedAction || 'General',
            patientGuidanceShown: session.safeOutput || session.decision?.safeOutput || null,
            caseStatus: session.status || 'active',
            createdAt: session.createdAt
        };
    } catch (e) {
        return null;
    }
};

const getGuidedCareContext = async ({ sessionId, patientId, requester }) => {
    try {
        const pId = patientId || (sessionId ? (await TriageSession.findById(sessionId))?.patientId : null);
        if (pId && !(await canAccessPatient(requester, pId))) return null;

        let session = null;
        if (sessionId) {
            session = await TriageSession.findById(sessionId);
            if (session && !(await canAccessSession(requester, session))) return null;
        }

        return {
            sessionId: session ? session._id : null,
            riskLevel: session?.decision?.riskLevel || 'UNKNOWN',
            mainSymptoms: session?.confirmedSymptoms?.length ? session.confirmedSymptoms : (session?.caseState?.symptoms || []),
            keyNegations: session?.caseState?.dangerSignsChecked || [],
            durationSummary: session?.caseState?.duration || {},
            followUpSummary: session?.caseState?.followUpAnswers || {},
            profileSummary: "Available via profile tool",
            recentHistorySummary: "Available via history tool",
            patientVisibleStatus: session?.status || 'UNKNOWN',
            referralStatus: session?.assignedHospitalSnapshot || null,
            safetyBoundaries: {
                canDiagnose: false,
                canPrescribe: false,
                canSuggestDosage: false,
                canDowngradeRisk: false,
                mustPreserveUrgency: true
            },
            recommendedAssistantTone: session?.decision?.riskLevel === 'HIGH' ? "urgent_and_calm" : "informative_and_reassuring"
        };
    } catch (e) {
        return null;
    }
};

const getRecentTriageHistory = async ({ patientId, limit = 3, requester }) => {
    try {
        if (!(await canAccessPatient(requester, patientId))) return { history: [] };

        const sessions = await TriageSession.find({ patientId }).sort({ createdAt: -1 }).limit(limit).lean();

        return {
            history: sessions.map(s => ({
                sessionId: s._id,
                date: s.createdAt,
                riskLevel: s.decision?.riskLevel || 'UNKNOWN',
                summary: s.decision?.safeOutput || s.safeOutput || "No summary available",
                status: s.status,
                referralStatus: s.assignedHospitalSnapshot || null
            }))
        };
    } catch (e) {
        return { history: [] };
    }
};

const getPatientVisibleStatus = async ({ sessionId, requester }) => {
    try {
        const session = await TriageSession.findById(sessionId);
        if (!session) return null;
        if (!(await canAccessSession(requester, session))) return null;

        const canSeeHospital = ['completed', 'VIEWED', 'REFERRED', 'RESOLVED'].includes(session.status);

        return {
            caseStatus: session.status || 'unknown',
            workerReviewStatus: ['VIEWED', 'CONTACTED', 'REFERRED', 'RESOLVED'].includes(session.status) ? session.status : 'PENDING_REVIEW',
            referralStatus: canSeeHospital && session.assignedHospitalId ? 'ASSIGNED' : 'PENDING',
            assignedHospitalName: canSeeHospital ? session.assignedHospitalSnapshot?.name : null,
            lastUpdatedAt: session.updatedAt
        };
    } catch (e) {
        return null;
    }
};

const getHealthWorkerCaseSummary = async ({ sessionId, requester }) => {
    try {
        if (!requiresWorkerOrAdmin(requester)) return null;

        const session = await TriageSession.findById(sessionId);
        if (!session) return null;
        if (!(await canAccessSession(requester, session))) return null;

        const docSummary = await getDocumentSummary(session.patientId, session._id);

        return {
            sessionId: session._id,
            profileSnapshot: session.profileSnapshot || {},
            rawSymptomInput: session.inputTextBn || '',
            extractedSymptoms: session.caseState?.symptoms || [],
            followUpAnswers: session.caseState?.followUpAnswers || {},
            riskLevel: session.decision?.riskLevel || 'UNKNOWN',
            matchedRules: session.decision?.matchedRules || [],
            evidenceTags: session.careGuidanceContext?.tags || [],
            guidanceShown: session.decision?.safeOutput || session.safeOutput || null,
            workerNotes: session.meta?.workerNotes || [],
            referralSnapshot: session.assignedHospitalSnapshot || null,
            documentUploadSummary: docSummary || {
                documentsUploaded: false,
                documentTypes: [],
                documentCount: 0,
                consentProvided: false
            },
            auditSummary: session.extractionAudit || null
        };
    } catch (e) {
        return null;
    }
};

module.exports = {
    getTriageProfileContext,
    getCurrentTriage,
    getGuidedCareContext,
    getRecentTriageHistory,
    getPatientVisibleStatus,
    getHealthWorkerCaseSummary
};
