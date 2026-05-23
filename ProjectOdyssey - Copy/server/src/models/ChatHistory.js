// server/src/models/ChatHistory.js
const supabase = require("../config/supabaseClient");

/**
 * Save a chat message to history
 * @param {string} userId - MongoDB user ID
 * @param {string} message - Message content
 * @param {string} role - 'user' or 'ai'
 * @param {string} sessionId - Optional session identifier
 * @param {object} metadata - Optional additional data (cards, etc.)
 */
async function saveMessage(userId, message, role, sessionId = null, metadata = {}) {
  const { data, error } = await supabase
    .from("chat_history")
    .insert({
      user_id: userId,
      message,
      role,
      session_id: sessionId,
      metadata,
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase saveMessage error:", error);
    throw new Error(`Failed to save message: ${error.message}`);
  }

  return data;
}

/**
 * Get chat history for a user
 * @param {string} userId - MongoDB user ID
 * @param {number} limit - Number of recent messages to fetch
 * @param {string} sessionId - Optional: filter by session
 */
async function getUserHistory(userId, limit = 50, sessionId = null) {
  let query = supabase
    .from("chat_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Supabase getUserHistory error:", error);
    throw new Error(`Failed to fetch history: ${error.message}`);
  }

  return data || [];
}

/**
 * Get recent conversation context for AI (last N messages)
 * @param {string} userId
 * @param {number} contextLimit - Number of recent messages for context (default: 10)
 */
async function getConversationContext(userId, contextLimit = 10) {
  const { data, error } = await supabase
    .from("chat_history")
    .select("message, role, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(contextLimit);

  if (error) {
    console.error("Supabase getConversationContext error:", error);
    return [];
  }

  // Return in chronological order (oldest first for context)
  return (data || []).reverse();
}

/**
 * Clear chat history for a user
 * @param {string} userId
 * @param {string} sessionId - Optional: clear specific session
 */
async function clearHistory(userId, sessionId = null) {
  let query = supabase.from("chat_history").delete().eq("user_id", userId);

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  }

  const { error } = await query;

  if (error) {
    console.error("Supabase clearHistory error:", error);
    throw new Error(`Failed to clear history: ${error.message}`);
  }

  return { success: true };
}

/**
 * Get total message count for a user
 */
async function getMessageCount(userId) {
  const { count, error } = await supabase
    .from("chat_history")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    console.error("Supabase getMessageCount error:", error);
    return 0;
  }

  return count || 0;
}

module.exports = {
  saveMessage,
  getUserHistory,
  getConversationContext,
  clearHistory,
  getMessageCount,
};
