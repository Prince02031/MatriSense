const express = require('express');
const router = express.Router();
const referralController = require('../controllers/referral.controller');

// POST /api/referral-notes - Create a new note
router.post('/', referralController.createNote);

// GET /api/referral-notes/:sessionId - Get notes for a session
router.get('/:sessionId', referralController.getNotesForSession);

module.exports = router;
