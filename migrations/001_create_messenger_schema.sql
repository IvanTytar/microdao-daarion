-- Migration: 001_create_messenger_schema
-- Description: Create Messenger module tables (Matrix-aware)
-- Date: 2025-11-24

-- ============================================================================
-- CHANNELS (Matrix rooms wrapper)
-- ============================================================================

CREATE TABLE channels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  
  -- MicroDAO context
  microdao_id     TEXT NOT NULL,           -- microdao:7
  team_id         UUID NULL,               -- FK to teams table (if exists)
  
  -- Matrix integration
  matrix_room_id  TEXT NOT NULL UNIQUE,    -- !roomid:daarion.city
  matrix_version  TEXT DEFAULT '10',        -- Matrix room version
  
  -- Visibility and access
  visibility      TEXT NOT NULL DEFAULT 'microdao',  -- public | private | microdao
  is_direct       BOOLEAN NOT NULL DEFAULT false,    -- DM channel
  is_encrypted    BOOLEAN NOT NULL DEFAULT false,    -- E2EE enabled
  
  -- Metadata
  topic           TEXT,
  avatar_url      TEXT,                     -- mxc:// URL
  
  -- Audit
  created_by      TEXT NOT NULL,            -- user:... | agent:...
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at     TIMESTAMPTZ NULL,
  
  -- Constraints
  CONSTRAINT channels_slug_microdao_unique UNIQUE (slug, microdao_id),
  CONSTRAINT channels_visibility_check CHECK (visibility IN ('public', 'private', 'microdao'))
);

-- Indexes
CREATE INDEX channels_microdao_idx ON channels(microdao_id);
CREATE INDEX channels_matrix_room_idx ON channels(matrix_room_id);
CREATE INDEX channels_created_at_idx ON channels(created_at DESC);
CREATE INDEX channels_visibility_idx ON channels(visibility) WHERE archived_at IS NULL;

COMMENT ON TABLE channels IS 'DAARION channels mapped to Matrix rooms';
COMMENT ON COLUMN channels.matrix_room_id IS 'Matrix room ID (!roomid:server)';
COMMENT ON COLUMN channels.visibility IS 'public = city-wide, microdao = microDAO members only, private = invited only';

-- ============================================================================
-- MESSAGES (Index of Matrix events, not primary storage)
-- ============================================================================

CREATE TABLE messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id        UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  
  -- Matrix event
  matrix_event_id   TEXT NOT NULL UNIQUE,   -- $event:server
  matrix_type       TEXT NOT NULL,           -- m.room.message, m.reaction, etc
  
  -- Sender
  sender_id         TEXT NOT NULL,           -- user:... | agent:...
  sender_type       TEXT NOT NULL,           -- human | agent
  sender_matrix_id  TEXT NOT NULL,           -- @user:server
  
  -- Content (indexed copy, full content in Matrix)
  content_preview   TEXT NOT NULL,           -- truncated plaintext
  content_type      TEXT NOT NULL DEFAULT 'text',  -- text | image | file | audio | video
  
  -- Threading
  thread_id         UUID NULL REFERENCES messages(id),  -- reply to message
  
  -- Metadata
  edited_at         TIMESTAMPTZ NULL,
  deleted_at        TIMESTAMPTZ NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT messages_sender_type_check CHECK (sender_type IN ('human', 'agent'))
);

-- Indexes
CREATE INDEX messages_channel_created_idx ON messages(channel_id, created_at DESC);
CREATE INDEX messages_sender_idx ON messages(sender_id);
CREATE INDEX messages_thread_idx ON messages(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX messages_matrix_event_idx ON messages(matrix_event_id);

COMMENT ON TABLE messages IS 'Index of Matrix events, full content stored in Matrix';
COMMENT ON COLUMN messages.content_preview IS 'Truncated/plaintext summary for quick access';
COMMENT ON COLUMN messages.matrix_event_id IS 'Matrix event ID ($eventid:server)';

-- ============================================================================
-- CHANNEL_MEMBERS (Permissions and roles)
-- ============================================================================

CREATE TABLE channel_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id      UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  
  -- Member identity
  member_id       TEXT NOT NULL,            -- user:... | agent:...
  member_type     TEXT NOT NULL,            -- human | agent
  matrix_user_id  TEXT NOT NULL,            -- @user:server | @agent:server
  
  -- Role
  role            TEXT NOT NULL DEFAULT 'member',  -- owner | admin | member | guest | agent
  
  -- Capabilities (DAARION-specific)
  can_read        BOOLEAN NOT NULL DEFAULT true,
  can_write       BOOLEAN NOT NULL DEFAULT true,
  can_invite      BOOLEAN NOT NULL DEFAULT false,
  can_kick        BOOLEAN NOT NULL DEFAULT false,
  can_create_tasks BOOLEAN NOT NULL DEFAULT false,
  
  -- Matrix power level
  matrix_power_level INTEGER NOT NULL DEFAULT 0,  -- 0-100
  
  -- Audit
  invited_by      TEXT NULL,                -- who invited
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at         TIMESTAMPTZ NULL,
  
  -- Constraints
  CONSTRAINT channel_members_unique UNIQUE (channel_id, member_id),
  CONSTRAINT channel_members_type_check CHECK (member_type IN ('human', 'agent')),
  CONSTRAINT channel_members_role_check CHECK (role IN ('owner', 'admin', 'member', 'guest', 'agent'))
);

-- Indexes
CREATE INDEX channel_members_channel_idx ON channel_members(channel_id) WHERE left_at IS NULL;
CREATE INDEX channel_members_member_idx ON channel_members(member_id) WHERE left_at IS NULL;

COMMENT ON TABLE channel_members IS 'Channel membership and permissions';
COMMENT ON COLUMN channel_members.matrix_power_level IS 'Matrix room power level (0=user, 50=moderator, 100=admin)';

-- ============================================================================
-- MESSAGE_REACTIONS (Emoji reactions, mapped to Matrix reactions)
-- ============================================================================

CREATE TABLE message_reactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  
  -- Reactor
  reactor_id      TEXT NOT NULL,            -- user:... | agent:...
  reactor_type    TEXT NOT NULL,            -- human | agent
  
  -- Reaction
  emoji           TEXT NOT NULL,            -- 👍, ❤️, etc
  matrix_event_id TEXT NOT NULL,            -- $reaction_event:server
  
  -- Audit
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  removed_at      TIMESTAMPTZ NULL,
  
  -- Constraints
  CONSTRAINT message_reactions_unique UNIQUE (message_id, reactor_id, emoji),
  CONSTRAINT message_reactions_type_check CHECK (reactor_type IN ('human', 'agent'))
);

-- Indexes
CREATE INDEX message_reactions_message_idx ON message_reactions(message_id) WHERE removed_at IS NULL;

COMMENT ON TABLE message_reactions IS 'Message reactions (mapped to m.reaction events)';

-- ============================================================================
-- CHANNEL_EVENTS (Audit log of channel actions)
-- ============================================================================

CREATE TABLE channel_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id      UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  
  -- Event
  event_type      TEXT NOT NULL,            -- channel.created, member.joined, member.left, etc
  actor_id        TEXT NOT NULL,            -- who did it
  target_id       TEXT NULL,                -- who/what was affected
  
  -- Payload
  metadata        JSONB NULL,
  
  -- Audit
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT channel_events_type_check CHECK (
    event_type IN (
      'channel.created', 'channel.updated', 'channel.archived',
      'member.joined', 'member.left', 'member.invited', 'member.kicked',
      'member.role_changed', 'message.pinned', 'message.unpinned'
    )
  )
);

-- Indexes
CREATE INDEX channel_events_channel_idx ON channel_events(channel_id, created_at DESC);
CREATE INDEX channel_events_type_idx ON channel_events(event_type);

COMMENT ON TABLE channel_events IS 'Audit log of channel-level actions';

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER channels_updated_at
  BEFORE UPDATE ON channels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Seed Data (Example channels for DAARION.city)
-- ============================================================================

-- DAARION.city MicroDAO (assuming it exists as microdao:daarion)
INSERT INTO channels (slug, name, description, microdao_id, matrix_room_id, visibility, created_by)
VALUES 
  ('general', 'General', 'Main DAARION.city channel', 'microdao:daarion', '!general:daarion.city', 'public', 'system:daarion'),
  ('announcements', 'Announcements', 'Official announcements', 'microdao:daarion', '!announcements:daarion.city', 'public', 'system:daarion'),
  ('agent-hub', 'Agent Hub', 'Chat with Team Assistant', 'microdao:daarion', '!agent-hub:daarion.city', 'microdao', 'system:daarion')
ON CONFLICT DO NOTHING;

COMMENT ON SCHEMA public IS 'Messenger schema v1 - Matrix-aware implementation';





