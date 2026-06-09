const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const referralController = require('../controllers/referral.controller');

// GET /api/patient/referrals — Fetch referrals for the logged-in patient
router.get('/', protect, referralController.getPatientReferrals);

// PUT /api/patient/referrals/:referralId/read — Mark referral as read
router.put('/:referralId/read', protect, referralController.markReferralAsRead);

// PUT /api/patient/referrals/:referralId/acknowledge — Acknowledge referral
router.put('/:referralId/acknowledge', protect, referralController.acknowledgeReferral);

module.exports = router;
