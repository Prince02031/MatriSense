const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const Like = require("../models/Like");
const Post = require("../models/Post");
const Notification = require("../models/Notification");

/**
 * POST /api/likes/:postId
 * Like a post (toggle behavior: like if not liked, unlike if already liked)
 */
router.post("/:postId", authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if user already liked this post
    const existingLike = await Like.findOne({ postId, userId });

    if (existingLike) {
      // Unlike: Remove the like
      await Like.findByIdAndDelete(existingLike._id);

      // Decrement likes count (but don't go below 0)
      const updatedPost = await Post.findByIdAndUpdate(postId, {
        $inc: { likesCount: -1 }
      }, { new: true });

      // Ensure likesCount never goes negative
      if (updatedPost.likesCount < 0) {
        await Post.findByIdAndUpdate(postId, { likesCount: 0 });
      }

      return res.json({
        success: true,
        message: "Post unliked successfully",
        liked: false
      });
    } else {
      // Like: Create a new like
      await Like.create({ postId, userId });

      // Increment likes count
      await Post.findByIdAndUpdate(postId, {
        $inc: { likesCount: 1 }
      });

      // Notify the post owner (skip if the liker IS the post owner)
      if (userId !== post.authorId.toString()) {
        try {
          // findOneAndUpdate with upsert so duplicate likes (edge-case race)
          // don't throw duplicate-key errors — just refresh the timestamp.
          await Notification.findOneAndUpdate(
            { actorId: userId, postId, type: "like" },
            { recipientId: post.authorId, actorId: userId, type: "like", postId, read: false },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        } catch (notifErr) {
          // Notification failure must never break the like response
          console.error("Notification create (like) error:", notifErr.message);
        }
      }

      return res.json({
        success: true,
        message: "Post liked successfully",
        liked: true
      });
    }

  } catch (err) {
    console.error("POST /api/likes/:postId error:", err);
    return res.status(500).json({ error: err.message || "Failed to toggle like" });
  }
});

/**
 * GET /api/likes/:postId
 * Get all users who liked a post
 * 
 * Query params:
 * - limit: number of likes per page (default: 20, max: 100)
 * - skip: number of likes to skip (for pagination)
 */
router.get("/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 20, skip = 0 } = req.query;

    const parsedLimit = Math.min(parseInt(limit) || 20, 100);
    const parsedSkip = parseInt(skip) || 0;

    // Fetch likes
    const likes = await Like.find({ postId })
      .sort({ createdAt: -1 }) // Most recent first
      .skip(parsedSkip)
      .limit(parsedLimit)
      .populate("userId", "username email");

    // Get total count
    const totalCount = await Like.countDocuments({ postId });

    return res.json({
      success: true,
      data: likes,
      pagination: {
        total: totalCount,
        limit: parsedLimit,
        skip: parsedSkip,
        hasMore: parsedSkip + likes.length < totalCount
      }
    });

  } catch (err) {
    console.error("GET /api/likes/:postId error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch likes" });
  }
});

/**
 * GET /api/likes/:postId/check
 * Check if the current user has liked a post
 */
router.get("/:postId/check", authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const like = await Like.findOne({ postId, userId });

    return res.json({
      success: true,
      liked: !!like
    });

  } catch (err) {
    console.error("GET /api/likes/:postId/check error:", err);
    return res.status(500).json({ error: err.message || "Failed to check like status" });
  }
});

/**
 * DELETE /api/likes/:postId
 * Unlike a post (explicit unlike, same as POST toggle when liked)
 */
router.delete("/:postId", authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Find and delete like
    const like = await Like.findOneAndDelete({ postId, userId });

    if (!like) {
      return res.status(404).json({ error: "You haven't liked this post" });
    }

    // Decrement likes count (but don't go below 0)
    const updatedPost = await Post.findByIdAndUpdate(postId, {
      $inc: { likesCount: -1 }
    }, { new: true });

    // Ensure likesCount never goes negative
    if (updatedPost.likesCount < 0) {
      await Post.findByIdAndUpdate(postId, { likesCount: 0 });
    }

    return res.json({
      success: true,
      message: "Post unliked successfully"
    });

  } catch (err) {
    console.error("DELETE /api/likes/:postId error:", err);
    return res.status(500).json({ error: err.message || "Failed to unlike post" });
  }
});

module.exports = router;
