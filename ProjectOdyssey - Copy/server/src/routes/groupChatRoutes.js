const express = require("express");
const router  = express.Router({ mergeParams: true }); // gives access to :groupId from parent

const authMiddleware = require("../middleware/authMiddleware");
const supabase       = require("../config/supabaseClient");
const GroupTripModel = require("../models/GroupTrip");
const User           = require("../models/User");

router.use(authMiddleware);

// ── helpers ────────────────────────────────────────────────────────────────

/** Ensure the request user is an approved member of the group */
async function requireMember(groupId, userId, res) {
  const member = await GroupTripModel.getMember(groupId, userId);
  if (!member || member.status !== "approved") {
    res.status(403).json({ error: "You are not a member of this group." });
    return false;
  }
  return true;
}

/**
 * Get or create the conversations row for a group.
 * Idempotent — safe to call on every request.
 */
async function getOrCreateConversation(groupId) {
  // Try to find existing
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("type", "group")
    .eq("context_id", groupId)
    .maybeSingle();

  if (existing) return existing.id;

  // Create new
  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ type: "group", context_id: groupId })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create conversation: ${error.message}`);
  return created.id;
}

// ── GET /api/groups/:groupId/messages ──────────────────────────────────────
/**
 * Fetch the last N messages for a group.
 * Query params: ?limit=50&before=<iso-timestamp>  (cursor-based paging)
 */
router.get("/", async (req, res) => {
  const { groupId } = req.params;
  try {
    if (!(await requireMember(groupId, req.user.id, res))) return;

    const limit  = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = req.query.before; // ISO timestamp for pagination

    const convId = await getOrCreateConversation(groupId);

    let query = supabase
      .from("messages")
      .select("id, sender_id, sender_username, content, message_type, mentions, is_deleted, created_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) query = query.lt("created_at", before);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    // Return in chronological order (oldest first for the UI)
    res.json({ success: true, messages: (rows || []).reverse(), conversationId: convId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/groups/:groupId/messages ─────────────────────────────────────
/**
 * Send a message to the group chat.
 * Body: { content: string, mentions?: string[] }
 */
router.post("/", async (req, res) => {
  const { groupId } = req.params;
  try {
    if (!(await requireMember(groupId, req.user.id, res))) return;

    const { content, mentions = [] } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Message content is required." });
    }

    const convId = await getOrCreateConversation(groupId);

    const { data: msg, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: convId,
        sender_id:       req.user.id,
        sender_username: req.user.username,
        content:         content.trim(),
        message_type:    "text",
        mentions:        mentions,
      })
      .select("id, sender_id, sender_username, content, message_type, mentions, created_at")
      .single();

    if (error) throw new Error(error.message);

    // TODO: Send @mention notifications
    // if (mentions.length > 0) { notificationService.sendMentionNotifications(mentions, groupId, req.user.username, content); }

    res.status(201).json({ success: true, message: msg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/groups/:groupId/messages/members ──────────────────────────────
/**
 * Returns slim member list for @mention autocomplete.
 * { id, username }[]
 */
router.get("/members", async (req, res) => {
  const { groupId } = req.params;
  try {
    if (!(await requireMember(groupId, req.user.id, res))) return;

    const members = await GroupTripModel.getMembers(groupId, "approved");
    const userIds = members.map((m) => m.user_id);

    const users = await User.find({ _id: { $in: userIds } }, "_id username").lean();
    const list = users.map((u) => ({ id: u._id.toString(), username: u.username }));

    res.json({ success: true, members: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
