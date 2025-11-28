-- Migration: Add is_test and deleted_at for soft delete
-- Purpose: Mark test entities and allow soft deletion
-- Date: 2025-11-28

-- agents: flag for test/temporary agents and soft-delete
ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- microdaos: flag for test/temporary microDAOs and soft-delete
ALTER TABLE microdaos
    ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_agents_is_test ON agents(is_test);
CREATE INDEX IF NOT EXISTS idx_agents_deleted_at ON agents(deleted_at);
CREATE INDEX IF NOT EXISTS idx_microdaos_is_test ON microdaos(is_test);
CREATE INDEX IF NOT EXISTS idx_microdaos_deleted_at ON microdaos(deleted_at);

