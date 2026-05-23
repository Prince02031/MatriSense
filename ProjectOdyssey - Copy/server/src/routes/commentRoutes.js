const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const Comment = require("../models/Comment");
const Post = require("../models/Post");
const Notification = require("../models/Notification");

/**
 * POST /api/comments
 * Add a comment to a post
 * 
 * Body:
 * {
 *   postId: "post-id",
 *   text: "comment text"
 * }
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { postId, text } = req.body;
    const userId = req.user.id;

    // Validation
    if (!postId || !text) {
      return res.status(400).json({ error: "postId and text are required" });
    }

    if (text.trim().length === 0) {
      return res.status(400).json({ error: "Comment cannot be empty" });
    }

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Create comment
    const comment = await Comment.create({
      postId,
      userId,
      text: text.trim()
    });

    // Increment comment count on post
    await Post.findByIdAndUpdate(postId, {
      $inc: { commentsCount: 1 }
    });

    // Notify the post owner (skip if the commenter IS the post owner)
    if (userId !== post.authorId.toString()) {
      try {
        await Notification.create({
          recipientId: post.authorId,
          actorId:     userId,
          type:        "comment",
          postId:      postId,
          commentId:   comment._id
        });
      } catch (notifErr) {
        // Notification failure must never break the comment response
        console.error("Notification create (comment) error:", notifErr.message);
      }
    }

    // Populate user details
    await comment.populate("userId", "username email");

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: comment
    });

  } catch (err) {
    console.error("POST /api/comments error:", err);
    return res.status(500).json({ error: err.message || "Failed to add comment" });
  }
});

/**
 * GET /api/comments/:postId
 * Get all comments for a post
 * 
 * Query params:
 * - limit: number of comments per page (default: 20, max: 100)
 * - skip: number of comments to skip (for pagination)
 */
router.get("/:postId", async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 20, skip = 0 } = req.query;

    const parsedLimit = Math.min(parseInt(limit) || 20, 100);
    const parsedSkip = parseInt(skip) || 0;

    // Fetch comments
    const comments = await Comment.find({ postId })
      .sort({ createdAt: 1 }) // Oldest first
      .skip(parsedSkip)
      .limit(parsedLimit)
      .populate("userId", "username email");

    // Get total count
    const totalCount = await Comment.countDocuments({ postId });

    return res.json({
      success: true,
      data: comments,
      pagination: {
        total: totalCount,
        limit: parsedLimit,
        skip: parsedSkip,
        hasMore: parsedSkip + comments.length < totalCount
      }
    });

  } catch (err) {
    console.error("GET /api/comments/:postId error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch comments" });
  }
});

/**
 * PUT /api/comments/:id
 * Update a comment (only author can update)
 * 
 * Body:
 * {
 *   text: "updated comment text"
 * }
 */
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    const userId = req.user.id;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Comment text cannot be empty" });
    }

    // Find comment
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check if user is the author
    if (comment.userId.toString() !== userId) {
      return res.status(403).json({ error: "You can only edit your own comments" });
    }

    // Update comment
    comment.text = text.trim();
    await comment.save();
    await comment.populate("userId", "username email");

    return res.json({
      success: true,
      message: "Comment updated successfully",
      data: comment
    });

  } catch (err) {
    console.error("PUT /api/comments/:id error:", err);
    return res.status(500).json({ error: err.message || "Failed to update comment" });
  }
});

/**
 * DELETE /api/comments/:id
 * Delete a comment (only author can delete)
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find comment
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check if user is the author
    if (comment.userId.toString() !== userId) {
      return res.status(403).json({ error: "You can only delete your own comments" });
    }

    // Decrement comment count on post
    await Post.findByIdAndUpdate(comment.postId, {
      $inc: { commentsCount: -1 }
    });

    // Delete comment
    await Comment.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: "Comment deleted successfully"
    });

  } catch (err) {
    console.error("DELETE /api/comments/:id error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete comment" });
  }
});

module.exports = router;
