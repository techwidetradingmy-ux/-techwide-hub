-- Performance indexes for messages table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/vnvdldbpberpfkddaiqr/sql

-- Index on is_dm + created_at (most queries filter by is_dm then sort by created_at)
CREATE INDEX IF NOT EXISTS idx_messages_is_dm_created_at
  ON messages (is_dm, created_at DESC);

-- Index for DM conversations: sender side
CREATE INDEX IF NOT EXISTS idx_messages_user_id_recipient_id
  ON messages (user_id, recipient_id, created_at DESC)
  WHERE is_dm = true;

-- Index for DM conversations: recipient side
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id_user_id
  ON messages (recipient_id, user_id, created_at DESC)
  WHERE is_dm = true;

-- Index for seen_at updates (markSeen query filters on user_id, recipient_id, seen_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_messages_unseen
  ON messages (user_id, recipient_id, seen_at)
  WHERE is_dm = true AND seen_at IS NULL;

-- Index for group chat (is_dm=false queries)
CREATE INDEX IF NOT EXISTS idx_messages_group_created_at
  ON messages (created_at DESC)
  WHERE is_dm = false;
