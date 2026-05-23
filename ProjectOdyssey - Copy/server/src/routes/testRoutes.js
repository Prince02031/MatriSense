const express = require('express');
const router = express.Router();
const { fetchWikipediaData } = require('../services/wikipediaService');

// POST /api/test/wiki
router.post('/wiki', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ success: false, error: "URL is required" });
    }

    const result = await fetchWikipediaData(url);

    if (result.success) {
        res.json(result);
    } else {
        res.status(400).json(result);
    }
});

module.exports = router;
