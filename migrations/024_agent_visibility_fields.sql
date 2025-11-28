-- Migration: Add visibility and listing fields to agents
-- Purpose: Unify Agent/Citizen model with proper visibility control
-- Date: 2025-11-28

-- Add visibility scope field
ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS visibility_scope TEXT NOT NULL DEFAULT 'city';

-- Add listing in directory flag
ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS is_listed_in_directory BOOLEAN NOT NULL DEFAULT true;

-- Add system agent flag
ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;

-- Add primary microDAO reference
ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS primary_microdao_id TEXT NULL;

-- Add slug for public URL
ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS slug TEXT NULL;

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_slug ON agents(slug) WHERE slug IS NOT NULL;

-- Add check constraint for visibility_scope
ALTER TABLE agents
    DROP CONSTRAINT IF EXISTS chk_visibility_scope;
ALTER TABLE agents
    ADD CONSTRAINT chk_visibility_scope 
    CHECK (visibility_scope IN ('city', 'microdao', 'owner_only'));

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_agents_visibility ON agents(visibility_scope, is_listed_in_directory);
CREATE INDEX IF NOT EXISTS idx_agents_primary_microdao ON agents(primary_microdao_id);

-- Update existing public agents to be listed
UPDATE agents 
SET is_listed_in_directory = true 
WHERE is_public = true;

-- Update non-public agents to not be listed
UPDATE agents 
SET is_listed_in_directory = false 
WHERE is_public = false;

-- Set system agents (infrastructure agents)
UPDATE agents
SET is_system = true
WHERE kind IN ('system', 'monitor', 'infrastructure')
   OR id LIKE 'ag_%';

-- Generate slugs from public_slug or id
UPDATE agents
SET slug = COALESCE(public_slug, LOWER(REPLACE(display_name, ' ', '-')))
WHERE slug IS NULL;

-- Set primary_microdao_id from first membership
UPDATE agents a
SET primary_microdao_id = (
    SELECT ma.microdao_id 
    FROM microdao_agents ma 
    WHERE ma.agent_id = a.id 
    ORDER BY ma.created_at 
    LIMIT 1
)
WHERE primary_microdao_id IS NULL;

-- Comments
COMMENT ON COLUMN agents.visibility_scope IS 'Visibility: city (public), microdao (members only), owner_only (private)';
COMMENT ON COLUMN agents.is_listed_in_directory IS 'Show in public Citizens directory';
COMMENT ON COLUMN agents.is_system IS 'System/infrastructure agent';
COMMENT ON COLUMN agents.primary_microdao_id IS 'Primary MicroDAO for this agent';
COMMENT ON COLUMN agents.slug IS 'URL-friendly slug for agent profile';

