-- Migration 010: City Backend (Rooms, Feed, Second Me)
-- DAARION City MVP Backend Completion

-- =============================================================================
-- City Rooms (Public Rooms)
-- =============================================================================

CREATE TABLE IF NOT EXISTS city_rooms (
  id TEXT PRIMARY KEY,                -- room_city_general, room_city_science, etc.
  slug TEXT NOT NULL UNIQUE,          -- general, science, builders
  name TEXT NOT NULL,                 -- General, Science, Builders
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT                     -- user_id (u_*) or NULL for system
);

CREATE INDEX IF NOT EXISTS ix_city_rooms_slug ON city_rooms(slug);
CREATE INDEX IF NOT EXISTS ix_city_rooms_created_at ON city_rooms(created_at DESC);

COMMENT ON TABLE city_rooms IS 'Публічні кімнати DAARION City';

-- =============================================================================
-- City Room Messages
-- =============================================================================

CREATE TABLE IF NOT EXISTS city_room_messages (
  id TEXT PRIMARY KEY,                -- m_city_ulid
  room_id TEXT NOT NULL REFERENCES city_rooms(id) ON DELETE CASCADE,
  author_user_id TEXT,                -- u_* (user who sent)
  author_agent_id TEXT,               -- ag_* (agent who sent)
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT check_author CHECK (
    (author_user_id IS NOT NULL AND author_agent_id IS NULL) OR
    (author_user_id IS NULL AND author_agent_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS ix_city_room_messages_room_time 
  ON city_room_messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_city_room_messages_author_user 
  ON city_room_messages(author_user_id);
CREATE INDEX IF NOT EXISTS ix_city_room_messages_author_agent 
  ON city_room_messages(author_agent_id);

COMMENT ON TABLE city_room_messages IS 'Повідомлення в публічних кімнатах City';

-- =============================================================================
-- City Feed Events
-- =============================================================================

CREATE TABLE IF NOT EXISTS city_feed_events (
  id TEXT PRIMARY KEY,                -- evt_city_ulid
  kind TEXT NOT NULL,                 -- 'room_message', 'agent_reply', 'system', 'dao_event'
  room_id TEXT REFERENCES city_rooms(id) ON DELETE SET NULL,
  user_id TEXT,                       -- u_*
  agent_id TEXT,                      -- ag_*
  payload JSONB NOT NULL,             -- flexible event data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_city_feed_time ON city_feed_events(created_at DESC);
CREATE INDEX IF NOT EXISTS ix_city_feed_kind ON city_feed_events(kind);
CREATE INDEX IF NOT EXISTS ix_city_feed_room ON city_feed_events(room_id) WHERE room_id IS NOT NULL;

COMMENT ON TABLE city_feed_events IS 'City Feed — агрегатор всіх подій міста';

-- =============================================================================
-- Second Me Sessions (персональний агент)
-- =============================================================================

CREATE TABLE IF NOT EXISTS secondme_sessions (
  id TEXT PRIMARY KEY,                -- smsess_ulid
  user_id TEXT NOT NULL,              -- u_*
  agent_id TEXT,                      -- ag_secondme_*
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_interaction_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_secondme_sessions_user ON secondme_sessions(user_id);
CREATE INDEX IF NOT EXISTS ix_secondme_sessions_last_interaction 
  ON secondme_sessions(user_id, last_interaction_at DESC NULLS LAST);

COMMENT ON TABLE secondme_sessions IS 'Сесії взаємодії користувачів з Second Me';

-- =============================================================================
-- Second Me Messages
-- =============================================================================

CREATE TABLE IF NOT EXISTS secondme_messages (
  id TEXT PRIMARY KEY,                -- smmsg_ulid
  session_id TEXT NOT NULL REFERENCES secondme_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,              -- u_*
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tokens_used INT,                    -- для assistant messages
  latency_ms INT,                     -- для assistant messages
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_secondme_messages_session_time 
  ON secondme_messages(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_secondme_messages_user 
  ON secondme_messages(user_id);

COMMENT ON TABLE secondme_messages IS 'Історія розмов з Second Me';

-- =============================================================================
-- Insert Default City Rooms
-- =============================================================================

INSERT INTO city_rooms (id, slug, name, description, is_default) VALUES
  ('room_city_general', 'general', 'General', 'Головна кімната DAARION City — тут зустрічається вся спільнота', TRUE),
  ('room_city_welcome', 'welcome', 'Welcome', 'Вітаємо нових учасників! Почніть свою подорож тут', TRUE),
  ('room_city_builders', 'builders', 'Builders', 'Кімната для будівників та розробників DAARION', TRUE),
  ('room_city_science', 'science', 'Science', 'Наукова спільнота — обговорення досліджень та експериментів', FALSE),
  ('room_city_energy', 'energy', 'Energy Union', 'Енергетична спільнота — decarbonization, renewables', FALSE)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Seed: Welcome Message
-- =============================================================================

INSERT INTO city_room_messages (id, room_id, author_agent_id, body, created_at) VALUES
  ('m_city_welcome_001', 'room_city_welcome', 'ag_system', 
   'Вітаємо в DAARION City! Це публічний простір для спілкування, співпраці та інновацій. Приєднуйтесь до обговорень! 🚀',
   NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO city_room_messages (id, room_id, author_agent_id, body, created_at) VALUES
  ('m_city_general_001', 'room_city_general', 'ag_system', 
   'Головна кімната міста активна! Тут ви можете обговорювати будь-які теми, пов''язані з DAARION. 🌆',
   NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Feed Event for Welcome
-- =============================================================================

INSERT INTO city_feed_events (id, kind, room_id, agent_id, payload, created_at) VALUES
  ('evt_city_welcome_001', 'system', 'room_city_welcome', 'ag_system', 
   '{"message": "Система ініціалізована", "type": "bootstrap"}',
   NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- END OF MIGRATION 010
-- =============================================================================

