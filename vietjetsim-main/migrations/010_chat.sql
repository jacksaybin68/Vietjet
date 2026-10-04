-- The chat tables were originally deployed with a minimal/incorrect schema and
-- this file rewrote them to the full shape `src/lib/db.ts` expects. The rewrite
-- was written as three unconditional `DROP TABLE` statements, which makes the
-- repair fire on *every* re-apply rather than only on the databases it was
-- written for: CI replays the whole set on one database, and so does any
-- deployment that re-runs migrations. Measured on a database holding one
-- conversation and one message: 1 and 1 before, 0 and 0 after re-running this
-- file alone — the admin support chat at /quan-tri/tin-nhan vanished, with the
-- customer's request still quoted in `last_message` nowhere to be found.
--
-- So the repair is now conditional on the table actually being the wrong
-- shape: a table missing any column this file defines is dropped and rebuilt,
-- and a table that already matches is left completely alone. Recreating an
-- identical table would only ever discard its rows.
--
-- `chat_messages` and `chat_presence` hold the FK to `chat_conversations`, so
-- the children are resolved first — both on their own shape, and whenever the
-- parent is about to be rebuilt, since a rebuilt parent cannot keep children
-- built against the old shape.

DO $repair$
DECLARE
  rebuild_parent BOOLEAN := false;
BEGIN
  IF to_regclass('chat_conversations') IS NOT NULL AND EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
           'id', 'user_id', 'user_email', 'user_name', 'status', 'last_message',
           'unread_by_user', 'unread_by_admin', 'created_at', 'updated_at'
         ]) AS wanted(column_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'chat_conversations'
        AND column_name = wanted.column_name
    )
  ) THEN
    rebuild_parent := true;
  END IF;

  IF to_regclass('chat_presence') IS NOT NULL AND (rebuild_parent OR EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
           'id', 'user_id', 'conversation_id', 'role', 'is_online',
           'is_typing', 'last_seen', 'updated_at'
         ]) AS wanted(column_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'chat_presence'
        AND column_name = wanted.column_name
    )
  )) THEN
    DROP TABLE chat_presence;
    RAISE NOTICE 'chat_presence shape is out of date; recreating';
  END IF;

  IF to_regclass('chat_messages') IS NOT NULL AND (rebuild_parent OR EXISTS (
    SELECT 1
    FROM unnest(ARRAY[
           'id', 'conversation_id', 'sender_id', 'sender_role', 'content',
           'read_at', 'created_at'
         ]) AS wanted(column_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'chat_messages'
        AND column_name = wanted.column_name
    )
  )) THEN
    DROP TABLE chat_messages;
    RAISE NOTICE 'chat_messages shape is out of date; recreating';
  END IF;

  IF rebuild_parent THEN
    DROP TABLE chat_conversations;
    RAISE NOTICE 'chat_conversations shape is out of date; recreating';
  END IF;
END $repair$;

CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  last_message TEXT,
  unread_by_user INTEGER DEFAULT 0,
  unread_by_admin INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (sender_role IN ('user', 'admin')),
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_online BOOLEAN DEFAULT false,
  is_typing BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (conversation_id, role)
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated ON chat_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_presence_conv_role ON chat_presence(conversation_id, role);
