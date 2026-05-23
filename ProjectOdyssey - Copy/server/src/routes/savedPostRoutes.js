const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const SavedPost = require("../models/SavedPost");
const Post = require("../models/Post");

/**
 * POST /api/saved-posts/:postId
 * Save a post (bookmark)
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

    // Check if already saved
    const existingSave = await SavedPost.findOne({ userId, postId });
    if (existingSave) {
      return res.status(400).json({ error: "Post already saved" });
    }

    // Save the post
    const savedPost = await SavedPost.create({ userId, postId });

    return res.status(201).json({
      success: true,
      message: "Post saved successfully",
      data: savedPost
    });

  } catch (err) {
    console.error("POST /api/saved-posts/:postId error:", err);
    return res.status(500).json({ error: err.message || "Failed to save post" });
  }
});

/**
 * DELETE /api/saved-posts/:postId
 * Unsave a post (remove bookmark)
 */
router.delete("/:postId", authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const savedPost = await SavedPost.findOneAndDelete({ userId, postId });

    if (!savedPost) {
      return res.status(404).json({ error: "Saved post not found" });
    }

    return res.json({
      success: true,
      message: "Post unsaved successfully"
    });

  } catch (err) {
    console.error("DELETE /api/saved-posts/:postId error:", err);
    return res.status(500).json({ error: err.message || "Failed to unsave post" });
  }
});

/**
 * GET /api/saved-posts
 * Get all saved posts for the authenticated user
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get saved posts with full post details
    const savedPosts = await SavedPost.find({ userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "postId",
        populate: {
          path: "authorId",
          select: "username email"
        }
      });

    // Filter out any saved posts where the post has been deleted
    const posts = savedPosts
      .filter(sp => sp.postId !== null)
      .map(sp => sp.postId);

    return res.json({
      success: true,
      data: posts
    });

  } catch (err) {
    console.error("GET /api/saved-posts error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch saved posts" });
  }
});

/**
 * GET /api/saved-posts/check/:postId
 * Check if a post is saved by the authenticated user
 */
router.get("/check/:postId", authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const savedPost = await SavedPost.findOne({ userId, postId });

    return res.json({
      success: true,
      isSaved: !!savedPost
    });

  } catch (err) {
    console.error("GET /api/saved-posts/check/:postId error:", err);
    return res.status(500).json({ error: err.message || "Failed to check saved status" });
  }
});

module.exports = router;
