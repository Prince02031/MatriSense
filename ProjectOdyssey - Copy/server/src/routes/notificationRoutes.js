const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const Notification = require("../models/Notification");

// All notification routes require authentication
router.use(authMiddleware);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notifications/unread-count
// Returns the integer unread count — used for the bell badge.
// Must be declared BEFORE /:id so Express doesn't treat "unread-count" as an id.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/unread-count", async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipientId: req.user.id,
      read: false
    });

    return res.json({ success: true, count });
  } catch (err) {
    console.error("GET /api/notifications/unread-count error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch unread count" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/notifications/read-all
// Mark ALL of the caller's notifications as read.
// Must be declared BEFORE /:id.
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/read-all", async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user.id, read: false },
      { $set: { read: true } }
    );

    return res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    console.error("PATCH /api/notifications/read-all error:", err);
    return res.status(500).json({ error: err.message || "Failed to mark notifications as read" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/notifications
// Clear ALL of the caller's notifications.
// Must be declared BEFORE /:id.
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/", async (req, res) => {
  try {
    const result = await Notification.deleteMany({ recipientId: req.user.id });

    return res.json({
      success: true,
      message: `${result.deletedCount} notification(s) cleared`
    });
  } catch (err) {
    console.error("DELETE /api/notifications error:", err);
    return res.status(500).json({ error: err.message || "Failed to clear notifications" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notifications
// Fetch the caller's notifications, unread first then newest-first.
//
// Query params:
//   limit  — items per page (default 20, max 50)
//   skip   — offset for pagination (default 0)
//   unread — if "true", return only unread notifications
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { limit = 20, skip = 0, unread } = req.query;

    const parsedLimit = Math.min(parseInt(limit) || 20, 50);
    const parsedSkip  = parseInt(skip) || 0;

    // Build filter
    const filter = { recipientId: req.user.id };
    if (unread === "true") filter.read = false;

    const notifications = await Notification.find(filter)
      .sort({ read: 1, createdAt: -1 })  // unread (0) before read (1), newest first
      .skip(parsedSkip)
      .limit(parsedLimit)
      // Populate the actor's avatar + username so the frontend can render
      // "alfi liked your post" with an avatar — no extra round trip needed.
      .populate("actorId", "username displayName profileImage")
      // Populate enough of the post so the frontend can show a preview
      .populate("postId", "type content mediaUrls")
      .lean();

    const totalCount = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      recipientId: req.user.id,
      read: false
    });

    return res.json({
      success: true,
      data: notifications,
      unreadCount,      // always returned so the badge can stay in sync
      pagination: {
        total: totalCount,
        limit: parsedLimit,
        skip: parsedSkip,
        hasMore: parsedSkip + notifications.length < totalCount
      }
    });
  } catch (err) {
    console.error("GET /api/notifications error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch notifications" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/notifications/:id/read
// Mark a single notification as read.
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user.id }, // guard: own notifications only
      { $set: { read: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    return res.json({ success: true, data: notification });
  } catch (err) {
    console.error("PATCH /api/notifications/:id/read error:", err);
    return res.status(500).json({ error: err.message || "Failed to mark notification as read" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/notifications/:id
// Delete a single notification (own notifications only).
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipientId: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    return res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    console.error("DELETE /api/notifications/:id error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete notification" });
  }
});

module.exports = router;
