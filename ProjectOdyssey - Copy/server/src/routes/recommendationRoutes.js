const express = require("express");
const router = express.Router();
const RecommendationService = require("../services/recommendationService");
const protect = require("../middleware/authMiddleware");

router.get("/", protect, async (req, res) => {
    try {
        const userId = req.user?.id; // Assumes auth middleware populates req.user
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const recommendations = await RecommendationService.getForUser(userId);
        res.json({ success: true, data: recommendations });
    } catch (err) {
        console.error("GET /recommendations error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.post("/generate", protect, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const recommendations = await RecommendationService.generateForUser(userId);
        res.json({ success: true, data: recommendations, message: "Recommendations regenerated successfully" });
    } catch (err) {
        console.error("POST /recommendations/generate error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
