-- Migration: Add is_archived flag to agents and microdaos
-- Purpose: Allow soft-delete/archiving of test data without physical deletion
-- Date: 2025-11-28

-- Add is_archived to agents
ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- Add is_archived to microdaos
ALTER TABLE microdaos
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- Add requires_microdao flag for enforcement
ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS requires_microdao BOOLEAN NOT NULL DEFAULT TRUE;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_agents_is_archived ON agents(is_archived) WHERE is_archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_microdaos_is_archived ON microdaos(is_archived) WHERE is_archived = FALSE;

-- Comment for documentation
COMMENT ON COLUMN agents.is_archived IS 'Soft-delete flag. Archived agents are hidden from UI but not deleted.';
COMMENT ON COLUMN agents.archive_reason IS 'Reason for archiving (e.g., "orphan_no_microdao", "test_data")';
COMMENT ON COLUMN agents.requires_microdao IS 'If TRUE, agent must belong to at least one MicroDAO';
COMMENT ON COLUMN microdaos.is_archived IS 'Soft-delete flag for MicroDAO';

