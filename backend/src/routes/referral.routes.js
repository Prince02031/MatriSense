const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referral.controller');
const { protect } = require('../middleware/authMiddleware');

// POST /api/referrals (notes)
router.post('/', protect, referralController.createNote);

// GET /api/referrals/:sessionId (notes)
router.get('/:sessionId', protect, referralController.getNotesForSession);

// Session Assignment and History endpoints
router.post('/session/:sessionId/assign', protect, referralController.assignHospital);
router.post('/session/:sessionId/reassign', protect, referralController.reassignHospital);
router.post('/session/:sessionId/status', protect, referralController.updateReferralStatus);
router.get('/session/:sessionId/history', protect, referralController.getAssignmentHistory);

// Patient Referral Preference endpoints
router.post('/patient-preference', protect, referralController.createPatientPreference);
router.get('/status/:sessionId', protect, referralController.getReferralStatus);
router.get('/preferences/:sessionId', protect, referralController.getPreferences);
router.post('/preferences/:preferenceId/cancel', protect, referralController.cancelPreference);
router.post('/preferences/:preferenceId/accept', protect, referralController.acceptPreference);
router.post('/preferences/:preferenceId/reject', protect, referralController.rejectPreference);

module.exports = router;
