const express = require('express');
const router = express.Router();
const workerController = require('../controllers/worker.controller');
const { protect } = require('../middleware/authMiddleware');

// Worker routes - protected by JWT auth
// GET /api/worker/cases - list all cases with pagination and filtering
router.get('/cases', protect, workerController.getCases);

// GET /api/worker/cases/:sessionId - get case detail
router.get('/cases/:sessionId', protect, workerController.getCaseDetail);

// PUT /api/worker/cases/:sessionId/status - update case status
router.put('/cases/:sessionId/status', protect, workerController.updateStatus);

// PUT /api/worker/cases/:sessionId/hospital - assign hospital
router.put('/cases/:sessionId/hospital', protect, workerController.assignHospital);

// POST /api/worker/cases/:sessionId/follow-up-date - set follow-up date
router.post('/cases/:sessionId/follow-up-date', protect, workerController.setFollowUpDate);

// GET /api/worker/cases/:sessionId/audit - get case audit timeline
router.get('/cases/:sessionId/audit', protect, workerController.getAuditLogs);

module.exports = router;
