// server/src/routes/chatHistory.routes.js
const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const ChatHistory = require("../models/ChatHistory");

/**
 * GET /api/chat/history
 * Fetch user's chat history
 * Query params:
 *   - limit: number of messages (default: 50)
 *   - sessionId: optional session filter
 */
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const sessionId = req.query.sessionId || null;

    const history = await ChatHistory.getUserHistory(userId, limit, sessionId);

    return res.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (err) {
    console.error("GET /chat/history error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch chat history" });
  }
});

/**
 * POST /api/chat/message
 * Save a chat message
 * Body: { message, role, sessionId?, metadata? }
 */
router.post("/message", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { message, role, sessionId, metadata } = req.body;

    if (!message || !role) {
      return res.status(400).json({ error: "message and role are required" });
    }

    if (!["user", "ai"].includes(role)) {
      return res.status(400).json({ error: "role must be 'user' or 'ai'" });
    }

    const saved = await ChatHistory.saveMessage(
      userId,
      message,
      role,
      sessionId || null,
      metadata || {}
    );

    return res.status(201).json({
      success: true,
      data: saved,
    });
  } catch (err) {
    console.error("POST /chat/message error:", err);
    return res.status(500).json({ error: err.message || "Failed to save message" });
  }
});

/**
 * DELETE /api/chat/history
 * Clear user's chat history
 * Query params:
 *   - sessionId: optional, clear specific session only
 */
router.delete("/history", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const sessionId = req.query.sessionId || null;

    await ChatHistory.clearHistory(userId, sessionId);

    return res.json({
      success: true,
      message: sessionId
        ? `Chat history for session ${sessionId} cleared`
        : "All chat history cleared",
    });
  } catch (err) {
    console.error("DELETE /chat/history error:", err);
    return res.status(500).json({ error: err.message || "Failed to clear history" });
  }
});

/**
 * GET /api/chat/stats
 * Get chat statistics for user
 */
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const messageCount = await ChatHistory.getMessageCount(userId);

    return res.json({
      success: true,
      data: {
        totalMessages: messageCount,
      },
    });
  } catch (err) {
    console.error("GET /chat/stats error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch stats" });
  }
});

module.exports = router;
