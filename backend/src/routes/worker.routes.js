const express = require('express');
const router = express.Router();
const workerController = require('../controllers/worker.controller');
const workerProfileController = require('../controllers/workerProfile.controller');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { handleUploadErrors } = require('../middleware/uploadMiddleware');

// ============================================================================
// Health Worker Profile & Certification Routes (protected)
// ============================================================================

/**
 * Pre-multer middleware: inject ownerType=HEALTH_WORKER into the body so that
 * uploadMiddleware routes the file to the healthworker-certifications subfolder.
 */
const injectWorkerOwnerType = (req, _res, next) => {
    if (!req.body) req.body = {};
    req.body.ownerType = 'HEALTH_WORKER';
    next();
};

// GET /api/worker/profile/me — Get own profile
router.get(
    '/profile/me',
    protect,
    authorizeRoles('HEALTH_WORKER', 'ADMIN'),
    workerProfileController.getProfile
);

// PUT /api/worker/profile/me — Update own profile
router.put(
    '/profile/me',
    protect,
    authorizeRoles('HEALTH_WORKER', 'ADMIN'),
    workerProfileController.updateProfile
);

// POST /api/worker/profile/certification — Upload certification document
router.post(
    '/profile/certification',
    protect,
    authorizeRoles('HEALTH_WORKER'),
    injectWorkerOwnerType,
    handleUploadErrors('file'),
    workerProfileController.uploadCertification
);

// GET /api/worker/profile/certification — List certification documents
router.get(
    '/profile/certification',
    protect,
    authorizeRoles('HEALTH_WORKER', 'ADMIN'),
    workerProfileController.getCertifications
);

// ============================================================================
// Case Management Routes (existing, now auth-protected)
// ============================================================================

// GET /api/worker/cases — list all cases with pagination and filtering
router.get('/cases', workerController.getCases);

// GET /api/worker/cases/:sessionId — get case detail
router.get('/cases/:sessionId', workerController.getCaseDetail);

// PUT /api/worker/cases/:sessionId/status — update case status
router.put('/cases/:sessionId/status', workerController.updateStatus);

// POST /api/worker/cases/:sessionId/follow-up-date — set follow-up date
router.post('/cases/:sessionId/follow-up-date', workerController.setFollowUpDate);

// GET /api/worker/cases/:sessionId/audit — get case audit timeline
router.get('/cases/:sessionId/audit', workerController.getAuditLogs);

// GET /api/worker/cases/:sessionId/documents — get patient documents for case
router.get('/cases/:sessionId/documents', workerController.getCaseDocuments);

module.exports = router;
