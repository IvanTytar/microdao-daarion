-- Migration 031: MicroDAO Multi-Room Support
-- Дозволяє кожному MicroDAO мати кілька кімнат

-- =============================================================================
-- Extend city_rooms for MicroDAO mapping
-- =============================================================================

ALTER TABLE city_rooms
    ADD COLUMN IF NOT EXISTS microdao_id uuid,
    ADD COLUMN IF NOT EXISTS room_role text,  -- 'primary', 'lobby', 'team', 'research', 'security', 'governance'
    ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 100;

-- Indexes for filtering by microdao
CREATE INDEX IF NOT EXISTS idx_city_rooms_microdao_id ON city_rooms(microdao_id);
CREATE INDEX IF NOT EXISTS idx_city_rooms_room_role ON city_rooms(room_role);
CREATE INDEX IF NOT EXISTS idx_city_rooms_sort_order ON city_rooms(sort_order);

-- Add comments
COMMENT ON COLUMN city_rooms.microdao_id IS 'Reference to microdao that owns this room';
COMMENT ON COLUMN city_rooms.room_role IS 'Role of room within MicroDAO: primary, lobby, team, research, security, governance';
COMMENT ON COLUMN city_rooms.is_public IS 'Whether room is visible to non-members';
COMMENT ON COLUMN city_rooms.sort_order IS 'Order for display (lower = first)';

-- =============================================================================
-- Backfill: Link existing rooms to MicroDAOs based on naming conventions
-- =============================================================================

-- DAARION DAO - leadership & system rooms
UPDATE city_rooms
SET microdao_id = (SELECT id FROM microdaos WHERE slug = 'daarion-dao' LIMIT 1),
    room_role = 'primary',
    sort_order = 0
WHERE slug = 'leadership-hall'
  AND microdao_id IS NULL;

UPDATE city_rooms
SET microdao_id = (SELECT id FROM microdaos WHERE slug = 'daarion-dao' LIMIT 1),
    room_role = 'governance',
    sort_order = 10
WHERE slug = 'system-control'
  AND microdao_id IS NULL;

-- Engineering rooms -> Developer Hub MicroDAO
UPDATE city_rooms
SET microdao_id = (SELECT id FROM microdaos WHERE slug = 'developer-hub' LIMIT 1),
    room_role = 'primary',
    sort_order = 0
WHERE slug = 'engineering-lab'
  AND microdao_id IS NULL;

UPDATE city_rooms
SET microdao_id = (SELECT id FROM microdaos WHERE slug = 'developer-hub' LIMIT 1),
    room_role = 'research',
    sort_order = 10
WHERE slug = 'rnd-lab'
  AND microdao_id IS NULL;

-- Security rooms -> Security MicroDAO (if exists)
UPDATE city_rooms
SET microdao_id = (SELECT id FROM microdaos WHERE slug LIKE '%security%' OR slug LIKE '%clan%' LIMIT 1),
    room_role = 'primary',
    sort_order = 0
WHERE slug = 'security-bunker'
  AND microdao_id IS NULL;

-- Web3 rooms -> DAO-related MicroDAO
UPDATE city_rooms
SET microdao_id = (SELECT id FROM microdaos WHERE slug = 'daarion-dao' LIMIT 1),
    room_role = 'team',
    sort_order = 20
WHERE slug = 'web3-district'
  AND microdao_id IS NULL;

-- Finance rooms
UPDATE city_rooms
SET microdao_id = (SELECT id FROM microdaos WHERE slug = 'daarion-dao' LIMIT 1),
    room_role = 'team',
    sort_order = 30
WHERE slug = 'finance-office'
  AND microdao_id IS NULL;

-- Marketing rooms
UPDATE city_rooms
SET microdao_id = (SELECT id FROM microdaos WHERE slug = 'daarion-dao' LIMIT 1),
    room_role = 'team',
    sort_order = 40
WHERE slug = 'marketing-hub'
  AND microdao_id IS NULL;

-- =============================================================================
-- Done
-- =============================================================================
SELECT 'Migration 031 completed: MicroDAO Multi-Room Support' as result;

