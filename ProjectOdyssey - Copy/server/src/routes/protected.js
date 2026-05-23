const express = require("express");
const protect = require("../middleware/authMiddleware");
const User = require("../models/User");
const GamificationService = require("../services/GamificationService");
const BadgeService = require("../services/BadgeService");
const router = express.Router();

// GET /profile
router.get("/profile", protect, async (req, res) => {
  try {
    // Trigger XP Sync before fetching
    await GamificationService.calculateAndSyncXP(req.user.id);

    // Trigger Badge Sync before fetching
    await BadgeService.calculateAndSyncBadges(req.user.id);

    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      message: "Profile fetched successfully",
      user
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /profile - Update user profile settings
router.put("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update allowed fields
    const allowedUpdates = [
      'displayName', 'bio', 'profileImage', 'coverImage',
      'travelStyle', 'privacy', 'preferences', 'notifications', 'email'
    ];

    // Apply updates
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    await user.save();

    // Return updated user without password
    const updatedUser = await User.findById(req.user.id).select("-password");

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
