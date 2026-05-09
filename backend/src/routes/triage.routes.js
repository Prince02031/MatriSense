const express = require('express');
const router = express.Router();

// Start a new triage session
router.post('/start', (req, res) => {
    res.status(501).json({ message: 'Start triage route not implemented yet' });
});

// Confirm AI extracted symptoms
router.post('/:sessionId/confirm', (req, res) => {
    res.status(501).json({ message: 'Confirm symptoms route not implemented yet' });
});

// Get follow-up questions
router.get('/:sessionId/follow-up', (req, res) => {
    res.status(501).json({ message: 'Get follow-up questions route not implemented yet' });
});

// Submit follow-up answers
router.post('/:sessionId/answers', (req, res) => {
    res.status(501).json({ message: 'Submit answers route not implemented yet' });
});

// Run triage engine
router.post('/:sessionId/run', (req, res) => {
    res.status(501).json({ message: 'Run triage engine route not implemented yet' });
});

// Get final triage result
router.get('/:sessionId/result', (req, res) => {
    res.status(501).json({ message: 'Get triage result route not implemented yet' });
});

module.exports = router;
