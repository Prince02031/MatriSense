-- Chat History Table for Conversational AI Context Retention
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'ai')),
  session_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster user queries
CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at DESC);
CREATE INDEX idx_chat_history_session ON chat_history(session_id);

-- RLS Policies (if using Row Level Security)
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own chat history
CREATE POLICY "Users can view own chat history"
  ON chat_history FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can insert their own messages
CREATE POLICY "Users can insert own messages"
  ON chat_history FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can delete their own chat history
CREATE POLICY "Users can delete own chat history"
  ON chat_history FOR DELETE
  USING (auth.uid()::text = user_id);

COMMENT ON TABLE chat_history IS 'Stores conversation history for conversational AI context retention';
COMMENT ON COLUMN chat_history.user_id IS 'MongoDB user ID from authentication system';
COMMENT ON COLUMN chat_history.role IS 'Message sender: user or ai';
COMMENT ON COLUMN chat_history.session_id IS 'Optional session grouping for conversations';
COMMENT ON COLUMN chat_history.metadata IS 'Additional data like cards, timestamps, etc.';
