const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const Follow = require("../models/Follow");
const User = require("../models/User");
const Notification = require("../models/Notification");

/**
 * POST /api/follow/:userId
 * Follow a user
 * Cannot follow yourself
 */
router.post("/:userId", authMiddleware, async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = req.params.userId;

    console.log(`[FOLLOW] User ${followerId} attempting to follow ${followingId}`);

    if (followerId === followingId) {
      return res.status(400).json({ error: "You cannot follow yourself" });
    }

    // Check target user exists
    const targetUser = await User.findById(followingId).select("username");
    if (!targetUser) {
      console.log(`[FOLLOW] Target user ${followingId} not found`);
      return res.status(404).json({ error: "User not found" });
    }

    // Create follow (will throw if already following due to unique index)
    const follow = await Follow.create({ followerId, followingId });
    console.log(`[FOLLOW] Follow document created:`, follow);

    // Create notification for the followed user
    try {
      await Notification.create({
        recipientId: followingId,
        actorId: followerId,
        type: "follow",
        postId: null,  // No post associated with follow notifications
        message: `started following you`
      });
      console.log(`[FOLLOW] Notification created for ${followingId}`);
    } catch (notifErr) {
      // Ignore duplicate notification errors (11000), log others
      if (notifErr.code !== 11000) {
        console.error("Failed to create follow notification:", notifErr);
      }
    }

    return res.status(201).json({
      success: true,
      message: `You are now following ${targetUser.username}`,
      data: follow
    });

  } catch (err) {
    // Duplicate key error = already following
    if (err.code === 11000) {
      return res.status(409).json({ error: "You are already following this user" });
    }
    console.error("POST /api/follow/:userId error:", err);
    return res.status(500).json({ error: err.message || "Failed to follow user" });
  }
});

/**
 * DELETE /api/follow/:userId
 * Unfollow a user
 */
router.delete("/:userId", authMiddleware, async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = req.params.userId;

    const result = await Follow.findOneAndDelete({ followerId, followingId });

    if (!result) {
      return res.status(404).json({ error: "You are not following this user" });
    }

    return res.json({
      success: true,
      message: "Unfollowed successfully"
    });

  } catch (err) {
    console.error("DELETE /api/follow/:userId error:", err);
    return res.status(500).json({ error: err.message || "Failed to unfollow user" });
  }
});

/**
 * GET /api/follow/check/:userId
 * Check if the logged-in user follows a specific user
 */
router.get("/check/:userId", authMiddleware, async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = req.params.userId;

    console.log(`[FOLLOW CHECK] Checking if ${followerId} follows ${followingId}`);

    const follow = await Follow.findOne({ followerId, followingId });
    console.log(`[FOLLOW CHECK] Result:`, follow ? 'Following' : 'Not following');

    return res.json({
      success: true,
      isFollowing: !!follow
    });

  } catch (err) {
    console.error("GET /api/follow/check/:userId error:", err);
    return res.status(500).json({ error: err.message || "Failed to check follow status" });
  }
});

/**
 * GET /api/follow/following
 * Get list of users the logged-in user follows
 */
router.get("/following", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const follows = await Follow.find({ followerId: userId })
      .populate("followingId", "username email profileImage displayName")
      .sort({ createdAt: -1 });

    const users = follows.map(f => f.followingId);

    return res.json({
      success: true,
      count: users.length,
      data: users
    });

  } catch (err) {
    console.error("GET /api/follow/following error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch following list" });
  }
});

/**
 * GET /api/follow/followers
 * Get list of users who follow the logged-in user
 */
router.get("/followers", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const follows = await Follow.find({ followingId: userId })
      .populate("followerId", "username email profileImage displayName")
      .sort({ createdAt: -1 });

    const users = follows.map(f => f.followerId);

    return res.json({
      success: true,
      count: users.length,
      data: users
    });

  } catch (err) {
    console.error("GET /api/follow/followers error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch followers list" });
  }
});

/**
 * GET /api/follow/stats/:userId
 * Get follower/following counts for any user (public)
 */
router.get("/stats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({ followingId: userId }),
      Follow.countDocuments({ followerId: userId })
    ]);

    return res.json({
      success: true,
      data: { followersCount, followingCount }
    });

  } catch (err) {
    console.error("GET /api/follow/stats/:userId error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch stats" });
  }
});

module.exports = router;
