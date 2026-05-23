// src/routes/reviewRoutes.js

const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const ReviewModel = require("../models/Review");
const Post = require("../models/Post");

/**
 * GET /api/reviews
 * Get all reviews for the logged-in user
 */
router.get("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const reviews = await ReviewModel.getUserReviews(userId);

        return res.json({
            success: true,
            data: reviews,
        });
    } catch (err) {
        console.error("GET /api/reviews error:", err);
        return res.status(500).json({ error: err.message || "Failed to fetch reviews" });
    }
});

/**
 * POST /api/reviews
 * Create a new review
 *
 * Body:
 * {
 *   placeName: "Tanah Lot Temple",
 *   location: "Bali, Indonesia",
 *   rating: 5,
 *   comment: "Amazing place!",
 *   title: "Must Visit"        (optional),
 *   images: ["url1", "url2"]   (optional),
 *   shareToFeed: true          (optional — auto-posts to social feed)
 * }
 */
router.post("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const username = req.user.username;
        const { placeName, location, rating, comment, title, images, shareToFeed } = req.body;

        if (!placeName) {
            return res.status(400).json({ error: "placeName is required" });
        }
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: "rating must be between 1 and 5" });
        }

        const review = await ReviewModel.createReview(userId, username, {
            placeName,
            location,
            rating,
            comment,
            title,
            images,
        });

        // ---------- Auto-share to feed (opt-in) ----------
        let feedPost = null;
        if (shareToFeed) {
            try {
                const stars = "⭐".repeat(rating) + "☆".repeat(5 - rating);
                const contentBlocks = [
                    {
                        type: "heading",
                        attrs: { level: 2 },
                        content: [{ type: "text", text: `Review: ${placeName}  ${stars}` }]
                    }
                ];
                if (title) {
                    contentBlocks.push({
                        type: "paragraph",
                        content: [{ type: "text", text: `"${title}"`, marks: [{ type: "italic" }] }]
                    });
                }
                if (comment) {
                    contentBlocks.push({
                        type: "paragraph",
                        content: [{ type: "text", text: comment }]
                    });
                }
                contentBlocks.push({
                    type: "paragraph",
                    content: [{ type: "text", text: `📍 ${placeName}  •  Rated ${rating}/5` }]
                });

                feedPost = await Post.create({
                    authorId: userId,
                    type: "review",
                    content: { type: "doc", content: contentBlocks },
                    reviewData: {
                        reviewId: review.id || null,
                        placeName,
                        placeType: review.place_type || "POI",
                        rating: Number(rating),
                        title: title || null,
                        comment: comment || null,
                        images: Array.isArray(images) ? images : [],
                        visitDate: null
                    }
                });

                await feedPost.populate("authorId", "username email");
                console.log("✅ Review auto-shared to feed:", feedPost._id);
            } catch (postErr) {
                // Don't fail the review creation if feed post fails
                console.error("⚠️ Failed to auto-share review to feed:", postErr);
            }
        }

        return res.status(201).json({
            success: true,
            message: shareToFeed
                ? "Review created and shared to feed successfully"
                : "Review created successfully",
            data: review,
            feedPost: feedPost || undefined
        });
    } catch (err) {
        console.error("POST /api/reviews error:", err);
        return res.status(500).json({ error: err.message || "Failed to create review" });
    }
});

/**
 * DELETE /api/reviews/:id
 * Delete a review (ownership verified)
 */
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Use deleteOwnedReview which handles UUID conversion and verification securely
        await ReviewModel.deleteOwnedReview(id, userId);

        return res.json({
            success: true,
            message: "Review deleted successfully",
        });
    } catch (err) {
        console.error("DELETE /api/reviews/:id error:", err);
        const status = err.message.includes("Unauthorized") ? 403 : 500;
        return res.status(status).json({ error: err.message || "Failed to delete review" });
    }
});

module.exports = router;
