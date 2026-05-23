const express        = require("express");
const jwt            = require("jsonwebtoken");
const User           = require("../models/User");
const Post           = require("../models/Post");
const Follow         = require("../models/Follow");
const SearchHistory  = require("../models/SearchHistory");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/**
 * OPTIONAL AUTH MIDDLEWARE
 *
 * If a valid Bearer token is present → sets req.user (same shape as authMiddleware)
 * If no token / invalid token       → continues with req.user = undefined
 *
 * Used so public endpoints can still enrich the response with
 * "isFollowing" when the caller is logged in.
 */
const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return next();
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch (_) {
    // invalid token — treat as unauthenticated, don't block
  }
  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users/search
// Search for users by username or displayName
//
// Auth: optional  (if logged in, each result includes isFollowing)
//
// Query params:
//   q      (required)  search term — matched against username + displayName
//   limit  (optional)  max results, default 10, max 20
//
// Response:
//   { success, count, data: [UserResult] }
//
// UserResult (private profile):
//   { _id, username, displayName, profileImage, isPrivate: true }
//
// UserResult (public profile):
//   { _id, username, displayName, profileImage, bio, travelStyle,
//     xp, level, isPrivate: false, isFollowing }
// ─────────────────────────────────────────────────────────────────────────────
router.get("/search", optionalAuth, async (req, res) => {
  try {
    const { q, limit: limitStr } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: "Search query 'q' is required" });
    }

    const limit    = Math.min(parseInt(limitStr) || 10, 20);
    const regex    = new RegExp(q.trim(), "i");
    const callerId = req.user?.id;

    const users = await User.find({
      $or: [
        { username:    regex },
        { displayName: regex }
      ]
    })
      .select("_id username displayName profileImage bio travelStyle xp level privacy")
      .limit(limit)
      .lean();

    // Enrich each result: respect privacy + add isFollowing
    const results = await Promise.all(users.map(async (u) => {
      const isOwnProfile = u._id.toString() === callerId;

      // Private profile — return minimal stub (unless it's their own)
      if (!u.privacy?.publicProfile && !isOwnProfile) {
        return {
          _id:          u._id,
          username:     u.username,
          displayName:  u.displayName,
          profileImage: u.profileImage,
          isPrivate:    true
        };
      }

      // Check if caller follows this user
      let isFollowing = false;
      if (callerId && !isOwnProfile) {
        const doc = await Follow.findOne({
          followerId:  callerId,
          followingId: u._id
        }).lean();
        isFollowing = !!doc;
      }

      return {
        _id:          u._id,
        username:     u.username,
        displayName:  u.displayName,
        profileImage: u.profileImage,
        bio:          u.bio,
        travelStyle:  u.travelStyle,
        xp:           u.xp,
        level:        u.level,
        isPrivate:    false,
        isFollowing
      };
    }));

    return res.json({
      success: true,
      count:   results.length,
      data:    results
    });

  } catch (err) {
    console.error("GET /api/users/search error:", err);
    return res.status(500).json({ error: err.message || "Search failed" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/users/search-history
// Record a profile click into the caller's search history.
// Call this when the user taps a search result to open a profile.
//
// Auth: required
//
// Body:
//   { searchedUserId: "<ObjectId>", query: "alfi" }   (query is optional)
//
// Behaviour: upserts — if this pair already exists, updatedAt is refreshed
// so the entry rises to the top of the history list. No duplicates.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/search-history", authMiddleware, async (req, res) => {
  try {
    const searcherId     = req.user.id;
    const { searchedUserId, query = "" } = req.body;

    if (!searchedUserId) {
      return res.status(400).json({ error: "searchedUserId is required" });
    }

    // Prevent recording yourself
    if (searcherId === searchedUserId.toString()) {
      return res.status(400).json({ error: "Cannot record yourself in search history" });
    }

    // Upsert: update query + updatedAt if pair exists, else create
    const entry = await SearchHistory.findOneAndUpdate(
      { searcherId, searchedUserId },
      { $set: { query } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({
      success: true,
      message: "Search history recorded",
      data: entry
    });

  } catch (err) {
    console.error("POST /api/users/search-history error:", err);
    return res.status(500).json({ error: err.message || "Failed to record search history" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users/search-history
// Get the caller's recent search history (last 20 entries, most recent first).
// Each entry includes the searched user's basic profile info.
//
// Auth: required
//
// Response:
//   { success, count, data: [{ _id, query, updatedAt, user: UserStub }] }
// ─────────────────────────────────────────────────────────────────────────────
router.get("/search-history", authMiddleware, async (req, res) => {
  try {
    const searcherId = req.user.id;

    const history = await SearchHistory.find({ searcherId })
      .sort({ updatedAt: -1 })
      .limit(20)
      .populate("searchedUserId", "_id username displayName profileImage")
      .lean();

    // Flatten into a cleaner shape
    const data = history.map(entry => ({
      _id:       entry._id,
      query:     entry.query,
      updatedAt: entry.updatedAt,
      user:      entry.searchedUserId   // populated user stub
    }));

    return res.json({
      success: true,
      count:   data.length,
      data
    });

  } catch (err) {
    console.error("GET /api/users/search-history error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch search history" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/users/search-history
// Clear the caller's ENTIRE search history.
//
// Auth: required
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/search-history", authMiddleware, async (req, res) => {
  try {
    const searcherId = req.user.id;

    const result = await SearchHistory.deleteMany({ searcherId });

    return res.json({
      success: true,
      message: `Search history cleared (${result.deletedCount} entries removed)`
    });

  } catch (err) {
    console.error("DELETE /api/users/search-history error:", err);
    return res.status(500).json({ error: err.message || "Failed to clear search history" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/users/search-history/:entryId
// Remove a single entry from the caller's search history.
// Use this for the "✕" button next to each history item.
//
// Auth: required
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/search-history/:entryId", authMiddleware, async (req, res) => {
  try {
    const searcherId = req.user.id;
    const { entryId } = req.params;

    const entry = await SearchHistory.findOneAndDelete({
      _id:       entryId,
      searcherId            // ensures users can only delete their own entries
    });

    if (!entry) {
      return res.status(404).json({ error: "History entry not found" });
    }

    return res.json({
      success: true,
      message: "History entry removed"
    });

  } catch (err) {
    console.error("DELETE /api/users/search-history/:entryId error:", err);
    return res.status(500).json({ error: err.message || "Failed to remove history entry" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users/:userId
// Get a user's full public profile with aggregated stats
//
// Auth: optional  (if logged in, response includes isFollowing + isOwnProfile)
//
// Response (private profile, not own):
//   { _id, username, displayName, profileImage, isPrivate: true, isOwnProfile, isFollowing }
//
// Response (public profile):
//   {
//     _id, username, displayName, profileImage, coverImage, bio,
//     travelStyle, xp, level, privacy,
//     isPrivate:    false,
//     isOwnProfile: bool,
//     isFollowing:  bool,
//     stats: { followersCount, followingCount, postsCount },
//     recentPosts:  Post[]   (last 6 posts, empty if showTripHistory=false and not own)
//   }
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:userId", optionalAuth, async (req, res) => {
  try {
    const { userId }   = req.params;
    const callerId     = req.user?.id;
    const isOwnProfile = callerId === userId;

    const user = await User.findById(userId)
      .select("-password -weeklyRecommendations -lastRecommendationWeek -notifications -preferences")
      .lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // ── Private profile guard ────────────────────────────────────────────────
    if (!user.privacy?.publicProfile && !isOwnProfile) {
      return res.json({
        success: true,
        data: {
          _id:          user._id,
          username:     user.username,
          displayName:  user.displayName,
          profileImage: user.profileImage,
          isPrivate:    true,
          isOwnProfile: false,
          isFollowing:  false
        }
      });
    }

    // ── Fetch all stats in parallel ──────────────────────────────────────────
    const [
      followersCount,
      followingCount,
      postsCount,
      recentPosts,
      followDoc
    ] = await Promise.all([
      Follow.countDocuments({ followingId: userId }),
      Follow.countDocuments({ followerId:  userId }),
      Post.countDocuments({ authorId: userId }),
      Post.find({ authorId: userId })
        .sort({ createdAt: -1 })
        .limit(6)
        .select("_id type content images reviewData tripProgress tripName tripId createdAt likesCount commentsCount authorId")
        .populate("authorId", "username email profilePicture displayName")
        .lean(),
      // Only check isFollowing if caller is logged in and viewing someone else's profile
      callerId && !isOwnProfile
        ? Follow.findOne({ followerId: callerId, followingId: userId }).lean()
        : Promise.resolve(null)
    ]);

    console.log(`[PROFILE] User ${callerId} viewing ${userId}. isFollowing:`, !!followDoc, 'followDoc:', followDoc);

    return res.json({
      success: true,
      data: {
        _id:          user._id,
        username:     user.username,
        displayName:  user.displayName,
        profileImage: user.profileImage,
        coverImage:   user.coverImage,
        bio:          user.bio,
        travelStyle:  user.travelStyle,
        xp:           user.xp,
        level:        user.level,
        privacy:      user.privacy,
        isPrivate:    false,
        isOwnProfile: !!isOwnProfile,
        isFollowing:  !!followDoc,
        stats: {
          followersCount,
          followingCount,
          postsCount
        },
        // Respect showTripHistory privacy — owners always see their own posts
        recentPosts: (user.privacy?.showTripHistory || isOwnProfile) ? recentPosts : []
      }
    });

  } catch (err) {
    console.error("GET /api/users/:userId error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch profile" });
  }
});

module.exports = router;
