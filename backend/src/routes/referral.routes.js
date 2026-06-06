const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referral.controller');
const { protect } = require('../middleware/authMiddleware');

// POST /api/referral-notes - Create a new note
router.post('/', referralController.createNote);

// GET /api/referral-notes/:sessionId - Get notes for a session
router.get('/:sessionId', referralController.getNotesForSession);

// Patient Referral Preference endpoints (mounted on /api/referrals)
router.post('/patient-preference', protect, referralController.createPatientPreference);
router.get('/status/:sessionId', protect, referralController.getReferralStatus);
router.get('/preferences/:sessionId', protect, referralController.getPreferences);
router.post('/preferences/:preferenceId/cancel', protect, referralController.cancelPreference);
router.post('/preferences/:preferenceId/accept', protect, referralController.acceptPreference);
router.post('/preferences/:preferenceId/reject', protect, referralController.rejectPreference);

module.exports = router;
