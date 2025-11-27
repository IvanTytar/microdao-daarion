-- Migration 013: City Map Coordinates
-- 2D City Map - add spatial coordinates and visual properties to city_rooms

-- =============================================================================
-- Add map coordinates and visual properties
-- =============================================================================

ALTER TABLE city_rooms
  ADD COLUMN IF NOT EXISTS map_x INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS map_y INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS map_w INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS map_h INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS room_type TEXT DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS zone TEXT DEFAULT 'central',
  ADD COLUMN IF NOT EXISTS icon TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT;

-- Create index for spatial queries
CREATE INDEX IF NOT EXISTS ix_city_rooms_map_coords ON city_rooms(map_x, map_y);
CREATE INDEX IF NOT EXISTS ix_city_rooms_zone ON city_rooms(zone);
CREATE INDEX IF NOT EXISTS ix_city_rooms_type ON city_rooms(room_type);

-- Add comments
COMMENT ON COLUMN city_rooms.map_x IS 'X coordinate on 2D city map (grid units)';
COMMENT ON COLUMN city_rooms.map_y IS 'Y coordinate on 2D city map (grid units)';
COMMENT ON COLUMN city_rooms.map_w IS 'Width on 2D city map (grid units)';
COMMENT ON COLUMN city_rooms.map_h IS 'Height on 2D city map (grid units)';
COMMENT ON COLUMN city_rooms.room_type IS 'Room type: public, governance, science, social, etc.';
COMMENT ON COLUMN city_rooms.zone IS 'City zone: central, north, south, east, west';
COMMENT ON COLUMN city_rooms.icon IS 'Icon identifier for UI (lucide icon name)';
COMMENT ON COLUMN city_rooms.color IS 'Primary color for room card/tile (hex or tailwind class)';

-- =============================================================================
-- Update existing rooms with map coordinates
-- Layout: 5x3 grid (central area)
-- =============================================================================

UPDATE city_rooms SET
  map_x = 2, map_y = 0, map_w = 2, map_h = 2,
  room_type = 'public', zone = 'central',
  icon = 'message-square', color = 'cyan'
WHERE id = 'room_city_general';

UPDATE city_rooms SET
  map_x = 0, map_y = 0, map_w = 2, map_h = 1,
  room_type = 'social', zone = 'west',
  icon = 'hand-wave', color = 'green'
WHERE id = 'room_city_welcome';

UPDATE city_rooms SET
  map_x = 4, map_y = 0, map_w = 2, map_h = 1,
  room_type = 'builders', zone = 'east',
  icon = 'hammer', color = 'orange'
WHERE id = 'room_city_builders';

UPDATE city_rooms SET
  map_x = 0, map_y = 1, map_w = 2, map_h = 1,
  room_type = 'science', zone = 'west',
  icon = 'flask-conical', color = 'purple'
WHERE id = 'room_city_science';

UPDATE city_rooms SET
  map_x = 4, map_y = 1, map_w = 2, map_h = 1,
  room_type = 'energy', zone = 'east',
  icon = 'zap', color = 'yellow'
WHERE id = 'room_city_energy';

-- =============================================================================
-- City Map Config (global settings)
-- =============================================================================

CREATE TABLE IF NOT EXISTS city_map_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  grid_width INTEGER NOT NULL DEFAULT 6,
  grid_height INTEGER NOT NULL DEFAULT 3,
  cell_size INTEGER NOT NULL DEFAULT 100,
  background_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO city_map_config (id, grid_width, grid_height, cell_size) VALUES
  ('default', 6, 3, 100)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE city_map_config IS 'Global configuration for 2D city map rendering';

-- =============================================================================
-- Agents table (for Agent Presence on map)
-- =============================================================================

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,                    -- ag_atlas, ag_oracle, etc.
  display_name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'assistant', -- assistant, civic, oracle, builder
  avatar_url TEXT,
  color TEXT DEFAULT 'cyan',
  status TEXT DEFAULT 'offline',          -- online, offline, busy
  current_room_id TEXT REFERENCES city_rooms(id) ON DELETE SET NULL,
  capabilities JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS ix_agents_room ON agents(current_room_id) WHERE current_room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_agents_kind ON agents(kind);

COMMENT ON TABLE agents IS 'AI Agents registry for DAARION City';

-- =============================================================================
-- Seed default agents
-- =============================================================================

INSERT INTO agents (id, display_name, kind, color, status, current_room_id, capabilities) VALUES
  ('ag_atlas', 'Atlas', 'civic', 'cyan', 'online', 'room_city_general', 
   '["chat", "moderation", "onboarding"]'),
  ('ag_oracle', 'Oracle', 'oracle', 'purple', 'online', 'room_city_science', 
   '["research", "analysis", "predictions"]'),
  ('ag_builder', 'Builder Bot', 'builder', 'orange', 'offline', 'room_city_builders', 
   '["code", "automation", "integration"]'),
  ('ag_greeter', 'Greeter', 'social', 'green', 'online', 'room_city_welcome', 
   '["welcome", "help", "faq"]')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  kind = EXCLUDED.kind,
  color = EXCLUDED.color,
  current_room_id = EXCLUDED.current_room_id,
  capabilities = EXCLUDED.capabilities,
  updated_at = NOW();

-- =============================================================================
-- END OF MIGRATION 013
-- =============================================================================

