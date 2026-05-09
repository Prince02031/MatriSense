const express = require('express');
const router = express.Router();

// Create a new referral note
router.post('/', (req, res) => {
    res.status(501).json({ message: 'Create referral note route not implemented yet' });
});

module.exports = router;
