const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const docsController = require('../controllers/docs.controller');

// Public endpoints
router.get('/status', docsController.getDocsStatus);
router.get('/stats', docsController.getDocsStats);
router.get('/content', docsController.getDocsContent);
router.get('/evidence', docsController.getDocsEvidence);
router.get('/evidence-file/:fileName', docsController.getEvidenceFile);

// Admin endpoints (protected) - use uppercase ADMIN to match User model role
router.put('/admin/status', protect, authorizeRoles('ADMIN'), docsController.updateDocsStatus);

module.exports = router;
