-- ============================================================
-- Group Messages & Direct Messages Schema
-- Handles: group chat (now) + direct messages (future)
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── CONVERSATIONS ──────────────────────────────────────────
-- A "conversation" is the container for a thread of messages.
-- type = 'group'  → linked to a group_trips row via context_id
-- type = 'dm'     → a 1-on-1 conversation between two users (future)
CREATE TABLE IF NOT EXISTS conversations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         VARCHAR(10) NOT NULL CHECK (type IN ('group', 'dm')),

  -- For group chats: the group_trips.id
  -- For DMs: NULL (participants table handles it)
  context_id   VARCHAR(255),

  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── CONVERSATION PARTICIPANTS ───────────────────────────────
-- Tracks who is in each conversation.
-- For group chats: all approved group_members are participants.
-- For DMs: exactly 2 users.
CREATE TABLE IF NOT EXISTS conversation_participants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         VARCHAR(255) NOT NULL,  -- MongoDB user _id
  joined_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(conversation_id, user_id)
);

-- ── MESSAGES ───────────────────────────────────────────────
-- All messages (group or DM) live in one table.
-- Modeled similarly to chat_history but for human-to-human chat.
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       VARCHAR(255) NOT NULL,  -- MongoDB user _id (matches chat_history.user_id pattern)
  sender_username VARCHAR(255),           -- Denormalized for read perf (no cross-DB join needed)
  content         TEXT NOT NULL,
  message_type    VARCHAR(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'join', 'leave')),

  -- @mention support
  -- Stores array of mentioned user_ids e.g. ["abc123", "everyone"]
  -- "everyone" is a special value meaning @everyone mention
  mentions        JSONB DEFAULT '[]',

  -- TODO: Push notifications for @mentions
  -- When a user is mentioned, create a notification row in a notifications table.
  -- mentions_notified BOOLEAN DEFAULT FALSE,  -- track if notifications were sent

  -- For future: soft delete (edit/delete messages)
  is_deleted      BOOLEAN DEFAULT FALSE,
  edited_at       TIMESTAMP WITH TIME ZONE,

  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── INDEXES ────────────────────────────────────────────────
CREATE INDEX idx_conversations_context ON conversations(context_id);
CREATE INDEX idx_conversations_type    ON conversations(type);
CREATE INDEX idx_conv_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_messages_conv         ON messages(conversation_id);
CREATE INDEX idx_messages_sender       ON messages(sender_id);
CREATE INDEX idx_messages_created      ON messages(created_at DESC);
-- For mention lookups (future notifications):
CREATE INDEX idx_messages_mentions     ON messages USING GIN (mentions);

-- ── HELPER FUNCTION ────────────────────────────────────────
-- Auto-update conversations.updated_at when a new message is inserted
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_messages_update_conv_ts
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- ── RLS POLICIES ───────────────────────────────────────────
-- NOTE: Since auth uses MongoDB JWTs (not Supabase Auth),
--       RLS enforcement is done at the API layer.
--       These policies are disabled but left as reference.
-- ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- ── COMMENTS ───────────────────────────────────────────────
COMMENT ON TABLE conversations IS 'Container for a chat thread — either a group chat or a DM.';
COMMENT ON COLUMN conversations.type IS 'group = group trip chat, dm = direct message between 2 users';
COMMENT ON COLUMN conversations.context_id IS 'For group chats: group_trips.id. For DMs: NULL.';
COMMENT ON TABLE conversation_participants IS 'Tracks membership in a conversation. For DMs: exactly 2 rows per conversation.';
COMMENT ON TABLE messages IS 'All messages across group chats and DMs.';
COMMENT ON COLUMN messages.mentions IS 'JSON array of mentioned user_ids. "everyone" = @everyone mention.';
COMMENT ON COLUMN messages.sender_username IS 'Denormalized username to avoid cross-DB lookups on every message read.';

-- ── EXAMPLE: How a group chat is bootstrapped ──────────────
-- When a group trip is created, call:
--   INSERT INTO conversations (type, context_id) VALUES ('group', '<group_trip_id>')
-- Then as members join/get approved, add them to conversation_participants.
-- This is handled in the backend groupService.js, not here.
