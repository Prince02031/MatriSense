const express = require('express');
const router = express.Router();
const workerController = require('../controllers/worker.controller');

// Mock Auth middleware (can integrate real auth later if needed)
// GET /api/worker/cases - list all cases with pagination and filtering
router.get('/cases', workerController.getCases);

// GET /api/worker/cases/:sessionId - get case detail
router.get('/cases/:sessionId', workerController.getCaseDetail);

// PUT /api/worker/cases/:sessionId/status - update case status
router.put('/cases/:sessionId/status', workerController.updateStatus);

// POST /api/worker/cases/:sessionId/follow-up-date - set follow-up date
router.post('/cases/:sessionId/follow-up-date', workerController.setFollowUpDate);

// GET /api/worker/cases/:sessionId/audit - get case audit timeline
router.get('/cases/:sessionId/audit', workerController.getAuditLogs);

module.exports = router;
