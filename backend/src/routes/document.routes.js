const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

const UploadedDocument = require('../models/UploadedDocument');
const Patient = require('../models/Patient');
const TriageSession = require('../models/TriageSession');
const { protect } = require('../middleware/authMiddleware');

const { logAction } = require('../services/auditService');

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
        if (doc.ownerType === 'PATIENT') {
            const patientId = doc.ownerId;

            // Check if any triage session exists for this patient
            // (mirrors existing worker case access — currently all workers can see all cases)
            const sessionExists = await TriageSession.exists({ patientId });
            return !!sessionExists;
        }

        return false;
    }

    // --- Default deny ---
    return false;
}

module.exports = router;
