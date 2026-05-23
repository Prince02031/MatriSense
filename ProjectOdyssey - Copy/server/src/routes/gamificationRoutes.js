"use strict";

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const GamificationService = require("../services/GamificationService");

/**
 * GET /api/gamification/stats
 * Returns unified gamification stats: xp, level, efficiency, streak
 */
router.get("/stats", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const [xpResult, efficiency, streak] = await Promise.all([
            GamificationService.calculateAndSyncXP(userId),
            GamificationService.calculateEfficiency(userId),
            GamificationService.calculateAndSyncStreak(userId),
        ]);

        res.json({
            success: true,
            data: {
                xp: xpResult.totalXP,
                level: xpResult.level,
                efficiency,
                streak: {
                    current: streak.currentStreak,
                    personalBest: streak.personalBest,
                },
            },
        });
    } catch (err) {
        console.error("GET /api/gamification/stats error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
