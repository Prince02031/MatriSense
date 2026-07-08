const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const UploadedDocument = require('../models/UploadedDocument');
const Patient = require('../models/Patient');
const TriageSession = require('../models/TriageSession');
const { protect } = require('../middleware/authMiddleware');
const { handleUploadErrors } = require('../middleware/uploadMiddleware');
const { analyzeDocument } = require('../services/documentAnalysisService');

const { logAction } = require('../services/auditService');

// Maps the AI's documentType classification onto the enum patient.routes.js
// uses for manually-tagged uploads, so both flows share one vocabulary.
const DOCUMENT_TYPE_TO_UPLOAD_ENUM = {
    prescription: 'PRESCRIPTION',
    lab_report: 'LAB_REPORT',
    ultrasound_report: 'ULTRASOUND_REPORT',
    blood_pressure_card: 'OTHER_MEDICAL_DOCUMENT',
    other: 'OTHER_MEDICAL_DOCUMENT',
};

/**
 * Pre-multer middleware: inject ownerType=PATIENT into the body so that
 * uploadMiddleware routes the file to the patient-documents subfolder.
 */
const injectPatientOwnerType = (req, _res, next) => {
    if (!req.body) req.body = {};
    req.body.ownerType = 'PATIENT';
    next();
};

// ============================================================================
// POST /api/documents/analyze
// Mother photographs a prescription/lab report/BP card. Gemini Vision
// extracts the values, flags maternal danger thresholds, and merges any
// recognized risk factors into the patient's profile.
// ============================================================================
router.post(
    '/analyze',
    protect,
    injectPatientOwnerType,
    handleUploadErrors('file'),
    async (req, res) => {
        try {
            if (req.user.role !== 'MOTHER') {
                return res.status(403).json({
                    success: false,
                    error: 'Only patients can upload documents for analysis.',
                });
            }

            const patient = await Patient.findOne({ userId: req.user._id });
            if (!patient) {
                return res.status(404).json({
                    success: false,
                    error: 'No patient profile found. Create a profile before uploading documents.',
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No file uploaded. Send an image in the "file" field.',
                });
            }

            const { relatedSessionId } = req.body;

            let analysis;
            try {
                const imageBuffer = fs.readFileSync(req.file.path);
                analysis = await analyzeDocument({ imageBuffer, mimeType: req.file.mimetype });
            } catch (analysisError) {
                console.error('[DocumentRoutes] Analysis failure:', analysisError.message);
                return res.status(502).json({
                    success: false,
                    error: 'Failed to analyze the document. Please try again or upload a clearer photo.',
                });
            }

            const doc = await UploadedDocument.create({
                ownerType: 'PATIENT',
                ownerId: patient._id,
                uploadedByUserId: req.user._id,
                relatedSessionId: relatedSessionId || undefined,
                documentType: DOCUMENT_TYPE_TO_UPLOAD_ENUM[analysis.documentType] || 'OTHER_MEDICAL_DOCUMENT',
                title: req.file.originalname,
                originalName: req.file.originalname,
                storedFileName: req.file.filename,
                storagePath: req.file.path,
                mimeType: req.file.mimetype,
                sizeBytes: req.file.size,
                accessScope: 'PATIENT_AND_ASSIGNED_HEALTH_WORKER',
                verificationStatus: 'PENDING',
                isActive: true,
                documentAnalysis: analysis,
                analyzedAt: new Date(),
            });

            // --- Merge recognized risk factors into the patient's known risk factors ---
            const newFlags = analysis.knownRiskFactorFlags || {};
            if (Object.keys(newFlags).length > 0) {
                patient.knownRiskFactors = {
                    ...(patient.knownRiskFactors || {}),
                    ...newFlags,
                };
                patient.markModified('knownRiskFactors');
                await patient.save();
            }

            await logAction(null, 'PATIENT_DOCUMENT_ANALYZED', 'PATIENT', {
                patientId: patient._id,
                documentId: doc._id,
                documentType: doc.documentType,
                riskFactorsDetected: analysis.riskFactorsDetected,
            }, req.user._id);

            res.status(201).json({
                success: true,
                documentId: doc._id,
                analysis,
                riskFactorsApplied: newFlags,
            });
        } catch (error) {
            console.error('[DocumentRoutes] POST /analyze error:', error.message);
            res.status(500).json({
                success: false,
                error: 'Failed to process document.',
            });
        }
    }
);

// ============================================================================
// GET /api/documents/:documentId/download
// Role-based document download with access checks
// ============================================================================
router.get('/:documentId/download', protect, async (req, res) => {
    try {
        const { documentId } = req.params;
        const user = req.user;

        // --- Find document ---
        const doc = await UploadedDocument.findById(documentId);

        if (!doc) {
            return res.status(404).json({
                success: false,
                error: 'Document not found.',
            });
        }

        if (!doc.isActive) {
            return res.status(404).json({
                success: false,
                error: 'Document not found.',
            });
        }

        // --- Role-based access check ---
        const hasAccess = await checkDocumentAccess(user, doc);

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: 'You do not have permission to access this document.',
            });
        }

        // --- Verify physical file exists ---
        const filePath = doc.storagePath;

        if (!filePath || !fs.existsSync(filePath)) {
            console.error(
                `[DocumentRoutes] File missing on disk for document ${documentId}`
            );
            return res.status(404).json({
                success: false,
                error: 'The requested file could not be found on the server.',
            });
        }

        // --- Audit ---
        await logAction(null, 'DOCUMENT_DOWNLOADED', user.role, {
            documentId,
            ownerType: doc.ownerType,
            documentType: doc.documentType,
        }, user._id);

        // --- Send file ---
        // Set Content-Type for inline viewing (images/PDF) or download
        const contentType = doc.mimeType || 'application/octet-stream';
        const downloadName = doc.originalName || doc.storedFileName || 'document';

        res.setHeader('Content-Type', contentType);
        res.setHeader(
            'Content-Disposition',
            `inline; filename="${encodeURIComponent(downloadName)}"`
        );

        const fileStream = fs.createReadStream(filePath);
        fileStream.on('error', (err) => {
            console.error(`[DocumentRoutes] Stream error for document ${documentId}:`, err.message);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to read file.',
                });
            }
        });

        fileStream.pipe(res);
    } catch (error) {
        console.error('[DocumentRoutes] GET /:documentId/download error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve document.',
        });
    }
});

// ============================================================================
// Access check logic
// ============================================================================

/**
 * Determine whether a user has permission to access a document.
 *
 * Rules:
 * 1. ADMIN → always allowed
 * 2. MOTHER (patient) → only own documents (matched via Patient.userId)
 * 3. HEALTH_WORKER → own certification docs, OR patient docs if they
 *    have at least one TriageSession for that patient
 */
async function checkDocumentAccess(user, doc) {
    const role = user.role;
    const userId = user._id.toString();

    // --- Rule 1: Admin has full access ---
    if (role === 'ADMIN') {
        return true;
    }

    // --- Rule 2: Patient access to own documents ---
    if (role === 'MOTHER') {
        if (doc.ownerType !== 'PATIENT') return false;

        // Find the patient profile linked to this user
        const patient = await Patient.findOne({ userId: user._id });
        if (!patient) return false;

        // The document must belong to this patient
        return doc.ownerId.toString() === patient._id.toString();
    }

    // --- Rule 3: Health worker access ---
    if (role === 'HEALTH_WORKER') {
        // 3a. Own certification documents
        if (doc.ownerType === 'HEALTH_WORKER') {
            return doc.uploadedByUserId.toString() === userId;
        }

        // 3b. Patient documents — worker must have a TriageSession for the patient
        //     AND the patient must have consented to share with health workers.
        if (doc.ownerType === 'PATIENT') {
            const patientId = doc.ownerId;

            // Check if any triage session exists for this patient
            const sessionExists = await TriageSession.exists({ patientId });
            if (!sessionExists) return false;

            // Check patient consent
            const patient = await Patient.findById(patientId);
            if (!patient || !patient.consentToShareWithHealthWorker) {
                return false;
            }

            return true;
        }

        return false;
    }

    // --- Default deny ---
    return false;
}

module.exports = router;
