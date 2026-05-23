const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const Like = require("../models/Like");
const Follow = require("../models/Follow");
const supabase = require("../config/supabaseClient");

/**
 * POST /api/posts
 * Create a new post (blog or auto)
 * 
 * Body:
 * {
 *   type: "blog" | "auto",
 *   content: { BlockNote JSON },
 *   tripId: "uuid-from-supabase" (optional),
 *   tripName: "Trip Name" (optional)
 * }
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { type, content, images, tripId, tripName } = req.body;
    const authorId = req.user.id; // From JWT token

    // Validation
    if (!type || !content) {
      return res.status(400).json({ error: "type and content are required" });
    }

    if (!["blog", "auto"].includes(type)) {
      return res.status(400).json({ error: "type must be 'blog' or 'auto'" });
    }

    // Create post
    const post = await Post.create({
      authorId,
      type,
      content,
      images: images || [],
      tripId: tripId || null,
      tripName: tripName || null
    });

    // Populate author details
    await post.populate("authorId", "username email");

    return res.status(201).json({
      success: true,
      message: "Post created successfully",
      data: post
    });

  } catch (err) {
    console.error("POST /api/posts error:", err);
    return res.status(500).json({ error: err.message || "Failed to create post" });
  }
});

/**
 * GET /api/posts
 * Get all posts (paginated, newest first)
 * 
 * Query params:
 * - limit: number of posts per page (default: 10, max: 50)
 * - cursor: post ID to start from (for pagination)
 * - type: filter by post type ("blog" or "auto")
 * - userId: filter by author
 */
router.get("/", async (req, res) => {
  try {
    const { limit = 10, cursor, type, userId } = req.query;
    
    const parsedLimit = Math.min(parseInt(limit) || 10, 50);
    
    // Build query
    const query = {};
    if (cursor) {
      query._id = { $lt: cursor }; // Get posts older than cursor
    }
    if (type) {
      query.type = type;
    }
    if (userId) {
      query.authorId = userId;
    }

    // Fetch posts
    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(parsedLimit)
      .populate("authorId", "username email");

    // Check if there are more posts
    const hasMore = posts.length === parsedLimit;
    const nextCursor = hasMore ? posts[posts.length - 1]._id : null;

    return res.json({
      success: true,
      data: posts,
      pagination: {
        hasMore,
        nextCursor
      }
    });

  } catch (err) {
    console.error("GET /api/posts error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch posts" });
  }
});

/**
 * GET /api/posts/user/:userId
 * Get all posts by a specific user
 */
router.get("/user/:userId", async (req, res) => {
  try {
    const posts = await Post.find({ authorId: req.params.userId })
      .sort({ createdAt: -1 })
      .populate("authorId", "username email");

    return res.json({
      success: true,
      data: posts
    });

  } catch (err) {
    console.error("GET /api/posts/user/:userId error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch user posts" });
  }
});

/**
 * GET /api/posts/trending
 * Get trending posts from the last week sorted by engagement score
 * 
 * Query params:
 * - limit: number of posts to return (default: 3, max: 20)
 * - days: number of days to look back (default: 7)
 */
router.get("/trending", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 3, 20);
    const days = parseInt(req.query.days) || 7;
    
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Fetch posts from the last N days
    const posts = await Post.find({
      createdAt: { $gte: cutoffDate }
    })
      .populate("authorId", "username email profilePicture displayName")
      .lean();

    // Calculate engagement score and sort: likes * 3 + comments * 2
    const rankedPosts = posts
      .map(post => ({
        ...post,
        _engagementScore: (post.likesCount * 3) + (post.commentsCount * 2)
      }))
      .sort((a, b) => {
        // Sort by engagement score (descending)
        const scoreDiff = b._engagementScore - a._engagementScore;
        if (scoreDiff !== 0) return scoreDiff;
        // If scores are equal, sort by date (newer first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, limit);

    return res.json({
      success: true,
      data: rankedPosts,
      period: `Last ${days} days`
    });

  } catch (err) {
    console.error("GET /api/posts/trending error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch trending posts" });
  }
});

/**
 * GET /api/posts/feed
 * Smart personalised feed — mix of friends' posts + trending posts.
 *
 * Algorithm per page:
 *   - 60% (6 posts) from people the user follows  → sorted by newest first
 *   - 40% (4 posts) from trending (everyone else) → sorted by engagement score
 *   - If friends pool runs dry, fill remaining slots from trending
 *   - If trending pool runs dry, fill remaining slots from friends
 *   - When BOTH pools are exhausted → allCaughtUp: true
 *
 * Cursor pagination:
 *   - First request: no cursor
 *   - Each response returns `nextCursor` (base64 encoded skip state)
 *   - Pass nextCursor as `cursor` query param to get next page
 *   - When allCaughtUp is true, show "You are all caught up!" message
 *
 * Query params:
 *   - cursor  (optional) - pagination cursor from previous response
 *   - limit   (optional) - posts per page, default 10, max 20
 */
router.get("/feed", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit  = Math.min(parseInt(req.query.limit) || 10, 20);

    // ── 1. Decode cursor ────────────────────────────────────────────────────
    let friendsSkip  = 0;
    let trendingSkip = 0;

    if (req.query.cursor) {
      try {
        const decoded    = Buffer.from(req.query.cursor, "base64").toString("utf8");
        const parsed     = JSON.parse(decoded);
        friendsSkip      = parsed.friendsSkip  || 0;
        trendingSkip     = parsed.trendingSkip || 0;
      } catch (_) {
        return res.status(400).json({ error: "Invalid cursor" });
      }
    }

    // ── 2. How many from each source per page ──────────────────────────────
    const FRIENDS_TARGET  = Math.ceil(limit * 0.6);  // 6 when limit=10
    const TRENDING_TARGET = limit - FRIENDS_TARGET;   // 4 when limit=10

    // ── 3. Get IDs of people this user follows ─────────────────────────────
    const followDocs   = await Follow.find({ followerId: userId }).select("followingId").lean();
    const followingIds = followDocs.map(f => f.followingId);

    // ── 4. Fetch friends posts pool ────────────────────────────────────────
    //    Posts from people the user follows, newest first
    let friendPosts = [];
    if (followingIds.length > 0) {
      friendPosts = await Post.find({ authorId: { $in: followingIds } })
        .sort({ createdAt: -1 })
        .skip(friendsSkip)
        .limit(FRIENDS_TARGET + 4)           // small buffer
        .populate("authorId", "username email profileImage displayName")
        .lean();
    }

    const friendsTaken    = Math.min(friendPosts.length, FRIENDS_TARGET);
    const friendPostIds   = friendPosts.slice(0, friendsTaken).map(p => p._id);

    // Gap: if friends pool gave fewer than target, trending fills the rest
    const friendsGap      = FRIENDS_TARGET - friendsTaken;
    const trendingTarget  = TRENDING_TARGET + friendsGap;

    // ── 5. Fetch trending posts pool ───────────────────────────────────────
    //    Posts from people the user does NOT follow (and not themselves),
    //    sorted by engagement (likes * 3 + comments * 2), then newest first.
    //    Exclude any IDs already in friendPosts to prevent duplicates.
    let trendingPosts = await Post.find({
      authorId: { $nin: [...followingIds, userId] },
      _id:      { $nin: friendPostIds }      // no duplication
    })
      .sort({ createdAt: -1 })               // Get recent posts first
      .limit((trendingTarget + 4) * 3)       // Fetch more to sort by engagement
      .populate("authorId", "username email profileImage displayName")
      .lean();

    // Calculate engagement score and sort: likes * 3 + comments * 2
    trendingPosts = trendingPosts
      .map(post => ({
        ...post,
        _engagementScore: (post.likesCount * 3) + (post.commentsCount * 2)
      }))
      .sort((a, b) => {
        // Sort by engagement score (descending)
        const scoreDiff = b._engagementScore - a._engagementScore;
        if (scoreDiff !== 0) return scoreDiff;
        // If scores are equal, sort by date (newer first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(trendingSkip, trendingSkip + trendingTarget + 4);

    const trendingTaken = Math.min(trendingPosts.length, trendingTarget);

    // Gap: if trending ran dry, backfill with more friends posts
    const trendingGap   = trendingTarget - trendingTaken;
    let extraFriendPosts = [];
    if (trendingGap > 0 && friendPosts.length > friendsTaken) {
      extraFriendPosts = friendPosts.slice(friendsTaken, friendsTaken + trendingGap);
    }

    // ── 6. Interleave: F F F T F F T F T T (approx 60/40 ratio) ──────────
    const friendsSlice  = friendPosts.slice(0, friendsTaken);
    const trendingSlice = trendingPosts.slice(0, trendingTaken);
    const combined      = [...friendsSlice, ...extraFriendPosts, ...trendingSlice];

    // Interleave for better UX: every 3 friends posts, 2 trending
    const merged = [];
    let fi = 0, ti = 0;
    const allFriends  = [...friendsSlice, ...extraFriendPosts];
    const allTrending = trendingSlice;

    while (merged.length < limit) {
      // Add up to 3 friends posts
      for (let i = 0; i < 3 && fi < allFriends.length && merged.length < limit; i++) {
        merged.push({ ...allFriends[fi], _feedSource: "friends" });
        fi++;
      }
      // Add up to 2 trending posts
      for (let i = 0; i < 2 && ti < allTrending.length && merged.length < limit; i++) {
        merged.push({ ...allTrending[ti], _feedSource: "trending" });
        ti++;
      }
      // If both exhausted, break
      if (fi >= allFriends.length && ti >= allTrending.length) break;
    }

    // ── 7. All caught up? ─────────────────────────────────────────────────
    const allCaughtUp = merged.length === 0;

    // ── 8. Build next cursor ──────────────────────────────────────────────
    const nextFriendsSkip  = friendsSkip  + friendsTaken  + extraFriendPosts.length;
    const nextTrendingSkip = trendingSkip + trendingTaken;
    const nextCursorObj    = { friendsSkip: nextFriendsSkip, trendingSkip: nextTrendingSkip };
    const nextCursor       = allCaughtUp
      ? null
      : Buffer.from(JSON.stringify(nextCursorObj)).toString("base64");

    return res.json({
      success: true,
      data: merged,
      pagination: {
        hasMore:     !allCaughtUp,
        nextCursor,
        allCaughtUp,
        message:     allCaughtUp ? "You are all caught up! Check back next time 🎉" : null,
        page: {
          friendsOnThisPage:  fi,
          trendingOnThisPage: ti,
          total: merged.length
        }
      }
    });

  } catch (err) {
    console.error("GET /api/posts/feed error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch feed" });
  }
});

/**
 * GET /api/posts/:id
 * Get a single post by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate("authorId", "username email");

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    return res.json({
      success: true,
      data: post
    });

  } catch (err) {
    console.error("GET /api/posts/:id error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch post" });
  }
});

/**
 * PUT /api/posts/:id
 * Update a post (only author can update)
 * 
 * Body:
 * {
 *   content: { BlockNote JSON },
 *   tripName: "New Trip Name" (optional)
 * }
 */
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { content, images, tripName, tripProgress, reviewData } = req.body;
    const userId = req.user.id;

    // Find post
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if user is the author
    if (post.authorId.toString() !== userId) {
      return res.status(403).json({ error: "You can only edit your own posts" });
    }

    // Update fields
    if (content) post.content = content;
    if (images !== undefined) post.images = images;
    if (tripName !== undefined) post.tripName = tripName;

    // Update tripProgress for trip update posts
    if (tripProgress && post.type === 'auto') {
      post.tripProgress = {
        locations: tripProgress.locations || [],
        currentLocationName: tripProgress.currentLocationName || '',
        totalLocations: tripProgress.locations?.length || 0,
        completionPercentage: tripProgress.completionPercentage || 0
      };

      // Also regenerate the auto content to reflect update
      const currentLoc = tripProgress.locations?.find((l) => l.isCurrentLocation);
      post.content = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `I've visited ${tripProgress.locations?.length || 0} locations on my journey! Currently at ${tripProgress.currentLocationName || (currentLoc?.name || 'an exciting place')}.`
              }
            ]
          }
        ]
      };
    }

    // Update reviewData for review posts, regenerate BlockNote content
    if (reviewData && post.type === 'review') {
      post.reviewData = {
        reviewId: post.reviewData?.reviewId ?? null,
        placeName: reviewData.placeName ?? post.reviewData?.placeName,
        placeType: reviewData.placeType ?? post.reviewData?.placeType ?? 'POI',
        rating: Number(reviewData.rating ?? post.reviewData?.rating),
        title: reviewData.title ?? post.reviewData?.title ?? null,
        comment: reviewData.comment ?? post.reviewData?.comment ?? null,
        images: Array.isArray(reviewData.images) ? reviewData.images : (post.reviewData?.images ?? []),
        visitDate: post.reviewData?.visitDate ?? null
      };

      const rd = post.reviewData;
      const stars = '⭐'.repeat(rd.rating) + '☆'.repeat(5 - rd.rating);
      const contentBlocks = [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: `Review: ${rd.placeName}  ${stars}` }]
        }
      ];
      if (rd.title) {
        contentBlocks.push({
          type: 'paragraph',
          content: [{ type: 'text', text: `"${rd.title}"`, marks: [{ type: 'italic' }] }]
        });
      }
      if (rd.comment) {
        contentBlocks.push({
          type: 'paragraph',
          content: [{ type: 'text', text: rd.comment }]
        });
      }
      contentBlocks.push({
        type: 'paragraph',
        content: [{ type: 'text', text: `📍 ${rd.placeName}  •  Rated ${rd.rating}/5` }]
      });
      post.content = { type: 'doc', content: contentBlocks };
    }

    await post.save();
    await post.populate("authorId", "username email");

    return res.json({
      success: true,
      message: "Post updated successfully",
      data: post
    });

  } catch (err) {
    console.error("PUT /api/posts/:id error:", err);
    return res.status(500).json({ error: err.message || "Failed to update post" });
  }
});

/**
 * DELETE /api/posts/:id
 * Delete a post (only author can delete)
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find post
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if user is the author
    if (post.authorId.toString() !== userId) {
      return res.status(403).json({ error: "You can only delete your own posts" });
    }

    // Delete associated comments and likes
    await Comment.deleteMany({ postId: req.params.id });
    await Like.deleteMany({ postId: req.params.id });

    // Delete post
    await Post.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: "Post deleted successfully"
    });

  } catch (err) {
    console.error("DELETE /api/posts/:id error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete post" });
  }
});

/**
 * POST /api/posts/trip-update
 * Create a trip update post with progress data
 * 
 * Body:
 * {
 *   tripId: "uuid-from-supabase",
 *   tripName: "Trip Name",
 *   tripProgress: {
 *     locations: [
 *       {
 *         name: "Location A",
 *         placeId: "ChIJ...",
 *         visitedAt: "2024-01-01T10:00:00Z",
 *         photos: ["url1", "url2"],
 *         isCurrentLocation: true
 *       }
 *     ],
 *     currentLocationName: "Location A",
 *     totalLocations: 5,
 *     completionPercentage: 40
 *   }
 * }
 */
router.post("/trip-update", authMiddleware, async (req, res) => {
  try {
    const { tripId, tripName, tripProgress } = req.body;
    const authorId = req.user.id;

    // Validation
    if (!tripId || !tripName || !tripProgress) {
      return res.status(400).json({ 
        error: "tripId, tripName, and tripProgress are required" 
      });
    }

    // Create auto-generated content
    const content = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [
            {
              type: "text",
              text: `Trip Update: ${tripName}`
            }
          ]
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: `I've visited ${tripProgress.locations?.length || 0} locations on my journey! Currently at ${tripProgress.currentLocationName}.`
            }
          ]
        }
      ]
    };

    // Create trip update post
    const post = await Post.create({
      authorId,
      type: "auto",
      content,
      tripId,
      tripName,
      tripProgress
    });

    // Populate author details
    await post.populate("authorId", "username email");

    return res.status(201).json({
      success: true,
      message: "Trip update post created successfully",
      data: post
    });

  } catch (err) {
    console.error("POST /api/posts/trip-update error:", err);
    return res.status(500).json({ error: err.message || "Failed to create trip update" });
  }
});

/**
 * POST /api/posts/review-share
 * Create a feed post from a place review.
 *
 * Two ways to call:
 *
 * Option A — share an existing Supabase review by ID:
 *   { "reviewId": "<uuid>" }
 *
 * Option B — supply review fields directly (creates a Supabase review first, then posts):
 *   {
 *     "placeName": "Eiffel Tower",
 *     "rating": 5,
 *     "title": "Breathtaking!",    // optional
 *     "comment": "The view is amazing",
 *     "images": ["https://..."],  // optional
 *     "placeType": "POI"           // optional, default "POI"
 *   }
 */
router.post("/review-share", authMiddleware, async (req, res) => {
  try {
    const authorId = req.user.id;
    const { reviewId, placeName, rating, title, comment, images, placeType } = req.body;

    let reviewData = {};

    if (reviewId) {
      // ── Option A: pull existing review from Supabase ──────────────────────
      const { data: review, error } = await supabase
        .from("reviews")
        .select("*, review_images(url)")
        .eq("id", reviewId)
        .single();

      if (error || !review) {
        return res.status(404).json({ error: "Review not found" });
      }

      reviewData = {
        reviewId: review.id,
        placeName: review.place_name,
        placeType: review.place_type || "POI",
        rating: review.rating,
        title: review.title || null,
        comment: review.comment || null,
        images: (review.review_images || []).map(img => img.url),
        visitDate: review.visit_date ? new Date(review.visit_date) : null
      };

    } else {
      // ── Option B: direct fields ────────────────────────────────────────────
      if (!placeName) {
        return res.status(400).json({ error: "Either reviewId or placeName is required" });
      }
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "rating must be between 1 and 5" });
      }

      reviewData = {
        reviewId: null,
        placeName,
        placeType: placeType || "POI",
        rating: Number(rating),
        title: title || null,
        comment: comment || null,
        images: Array.isArray(images) ? images : [],
        visitDate: null
      };
    }

    // ── Build star string (e.g. "⭐⭐⭐⭐⭐") ──────────────────────────────
    const stars = "⭐".repeat(reviewData.rating) + "☆".repeat(5 - reviewData.rating);

    // ── Auto-generate BlockNote content ───────────────────────────────────
    const contentBlocks = [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [
          {
            type: "text",
            text: `Review: ${reviewData.placeName}  ${stars}`
          }
        ]
      }
    ];

    if (reviewData.title) {
      contentBlocks.push({
        type: "paragraph",
        content: [{ type: "text", text: `"${reviewData.title}"`, marks: [{ type: "italic" }] }]
      });
    }

    if (reviewData.comment) {
      contentBlocks.push({
        type: "paragraph",
        content: [{ type: "text", text: reviewData.comment }]
      });
    }

    contentBlocks.push({
      type: "paragraph",
      content: [{ type: "text", text: `📍 ${reviewData.placeName}  •  Rated ${reviewData.rating}/5` }]
    });

    const content = { type: "doc", content: contentBlocks };

    // ── Create the post ────────────────────────────────────────────────────
    const post = await Post.create({
      authorId,
      type: "review",
      content,
      reviewData
    });

    await post.populate("authorId", "username email");

    return res.status(201).json({
      success: true,
      message: "Review shared to feed successfully",
      data: post
    });

  } catch (err) {
    console.error("POST /api/posts/review-share error:", err);
    return res.status(500).json({ error: err.message || "Failed to share review" });
  }
});

module.exports = router;
