-- Migration: Add visibility fields to MicroDAO and update Agent visibility
-- Purpose: Support Task 029 (Orchestrator & Visibility Flow)
-- Date: 2025-11-28

-- ============================================================================
-- MICRODAOS TABLE
-- ============================================================================

-- Add is_public flag
ALTER TABLE microdaos
    ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- Create index
CREATE INDEX IF NOT EXISTS idx_microdaos_is_public ON microdaos(is_public);


-- ============================================================================
-- AGENTS TABLE
-- ============================================================================

-- Update constraint for visibility_scope to support new values
-- Old values: 'city', 'microdao', 'owner_only'
-- New values: 'global', 'microdao', 'private'
-- We will map: city -> global, owner_only -> private

-- 1. Drop existing constraint
ALTER TABLE agents
    DROP CONSTRAINT IF EXISTS chk_visibility_scope;

-- 2. Migrate data
UPDATE agents
SET visibility_scope = 'global'
WHERE visibility_scope = 'city';

UPDATE agents
SET visibility_scope = 'private'
WHERE visibility_scope = 'owner_only';

-- 3. Add new constraint
ALTER TABLE agents
    ADD CONSTRAINT chk_visibility_scope 
    CHECK (visibility_scope IN ('global', 'microdao', 'private'));

-- 4. Ensure is_public is synced with visibility_scope
UPDATE agents
SET is_public = true
WHERE visibility_scope = 'global';

UPDATE agents
SET is_public = false
WHERE visibility_scope IN ('microdao', 'private');

