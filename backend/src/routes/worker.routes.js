const express = require('express');
const router = express.Router();

// Get list of cases for the dashboard
router.get('/cases', (req, res) => {
    res.status(501).json({ message: 'List cases route not implemented yet' });
});

// Get detailed case view for a session
router.get('/cases/:sessionId', (req, res) => {
    res.status(501).json({ message: 'View case details route not implemented yet' });
});

// Update the status of a case (e.g., reviewed, followed up)
router.put('/cases/:sessionId/status', (req, res) => {
    res.status(501).json({ message: 'Update case status route not implemented yet' });
});

module.exports = router;
