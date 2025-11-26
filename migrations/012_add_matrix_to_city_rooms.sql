-- Migration 012: Add Matrix fields to city_rooms
-- MATRIX ROOMS BRIDGE - link City Rooms to Matrix rooms

-- Add Matrix room fields
ALTER TABLE city_rooms
  ADD COLUMN IF NOT EXISTS matrix_room_id TEXT,
  ADD COLUMN IF NOT EXISTS matrix_room_alias TEXT;

-- Create unique indexes (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS city_rooms_matrix_room_id_uq
  ON city_rooms (matrix_room_id)
  WHERE matrix_room_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS city_rooms_matrix_room_alias_uq
  ON city_rooms (matrix_room_alias)
  WHERE matrix_room_alias IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN city_rooms.matrix_room_id IS 'Matrix room ID (e.g., !abc123:daarion.space)';
COMMENT ON COLUMN city_rooms.matrix_room_alias IS 'Matrix room alias (e.g., #city_general:daarion.space)';

