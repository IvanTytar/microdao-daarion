-- Migration: Align Agent/MicroDAO model
-- Purpose: Standardize fields for Agent Console, Citizens, MicroDAO Dashboard
-- Date: 2025-11-28

-- ============================================================================
-- AGENTS TABLE
-- ============================================================================

-- Add is_orchestrator flag (agent can create/manage microDAOs)
ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS is_orchestrator boolean NOT NULL DEFAULT false;

-- Create index for orchestrator lookup
CREATE INDEX IF NOT EXISTS idx_agents_is_orchestrator ON agents(is_orchestrator) WHERE is_orchestrator = true;

-- Update existing orchestrators based on kind
UPDATE agents
SET is_orchestrator = true
WHERE kind = 'orchestrator'
  AND is_orchestrator = false;

-- ============================================================================
-- MICRODAOS TABLE
-- ============================================================================

-- Add is_platform flag (microDAO is a platform/district)
ALTER TABLE microdaos
    ADD COLUMN IF NOT EXISTS is_platform boolean NOT NULL DEFAULT false;

-- Add orchestrator_agent_id as alias/copy of owner_agent_id for clarity
-- (keeping owner_agent_id for backward compatibility)
ALTER TABLE microdaos
    ADD COLUMN IF NOT EXISTS orchestrator_agent_id text;

-- Copy owner_agent_id to orchestrator_agent_id where not set
UPDATE microdaos
SET orchestrator_agent_id = owner_agent_id
WHERE orchestrator_agent_id IS NULL
  AND owner_agent_id IS NOT NULL;

-- Add parent_microdao_id for hierarchy (platform -> child microDAOs)
ALTER TABLE microdaos
    ADD COLUMN IF NOT EXISTS parent_microdao_id text;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_microdaos_is_platform ON microdaos(is_platform) WHERE is_platform = true;
CREATE INDEX IF NOT EXISTS idx_microdaos_orchestrator ON microdaos(orchestrator_agent_id);
CREATE INDEX IF NOT EXISTS idx_microdaos_parent ON microdaos(parent_microdao_id);

-- Add foreign key for parent_microdao_id (self-reference)
-- Note: Using DO block to handle if constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'microdaos_parent_fk'
    ) THEN
        ALTER TABLE microdaos
            ADD CONSTRAINT microdaos_parent_fk
            FOREIGN KEY (parent_microdao_id)
            REFERENCES microdaos(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- Add foreign key for orchestrator_agent_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'microdaos_orchestrator_agent_fk'
    ) THEN
        ALTER TABLE microdaos
            ADD CONSTRAINT microdaos_orchestrator_agent_fk
            FOREIGN KEY (orchestrator_agent_id)
            REFERENCES agents(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN agents.is_orchestrator IS 'Agent can create and manage microDAOs';
COMMENT ON COLUMN agents.visibility_scope IS 'Visibility: global (everyone), microdao (members only), private (owner only)';
COMMENT ON COLUMN agents.is_public IS 'Agent visible in public Citizens catalog';
COMMENT ON COLUMN agents.primary_microdao_id IS 'Primary microDAO affiliation';

COMMENT ON COLUMN microdaos.is_platform IS 'MicroDAO is a platform/district (top-level organization)';
COMMENT ON COLUMN microdaos.orchestrator_agent_id IS 'Main orchestrator agent for this microDAO';
COMMENT ON COLUMN microdaos.parent_microdao_id IS 'Parent microDAO for hierarchy (platform -> child)';

