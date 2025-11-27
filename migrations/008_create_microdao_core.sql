-- ============================================================================
-- Migration 008: microDAO Core Tables
-- Phase 7: microDAO Console (MVP)
-- ============================================================================

-- ============================================================================
-- Table: microdaos
-- Purpose: MicroDAO entities (communities, organizations, teams)
-- ============================================================================

CREATE TABLE IF NOT EXISTS microdaos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_microdaos_slug ON microdaos(slug);
CREATE INDEX idx_microdaos_owner_user_id ON microdaos(owner_user_id);
CREATE INDEX idx_microdaos_is_active ON microdaos(is_active);

COMMENT ON TABLE microdaos IS 'MicroDAO entities (communities, organizations)';
COMMENT ON COLUMN microdaos.external_id IS 'External identifier like microdao:7';
COMMENT ON COLUMN microdaos.slug IS 'URL-friendly slug like daarion-city';

-- ============================================================================
-- Table: microdao_members
-- Purpose: Members of microDAOs with roles
-- ============================================================================

CREATE TABLE IF NOT EXISTS microdao_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    microdao_id UUID NOT NULL REFERENCES microdaos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(microdao_id, user_id)
);

CREATE INDEX idx_microdao_members_user_id ON microdao_members(user_id);
CREATE INDEX idx_microdao_members_microdao_id ON microdao_members(microdao_id);
CREATE INDEX idx_microdao_members_microdao_id_role ON microdao_members(microdao_id, role);

COMMENT ON TABLE microdao_members IS 'Members of microDAOs with roles';
COMMENT ON COLUMN microdao_members.role IS 'owner, admin, member, guest';

-- ============================================================================
-- Table: microdao_treasury
-- Purpose: Token balances for microDAOs
-- ============================================================================

CREATE TABLE IF NOT EXISTS microdao_treasury (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    microdao_id UUID NOT NULL REFERENCES microdaos(id) ON DELETE CASCADE,
    token_symbol TEXT NOT NULL,
    balance NUMERIC(30, 8) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(microdao_id, token_symbol)
);

CREATE INDEX idx_microdao_treasury_microdao_id ON microdao_treasury(microdao_id);

COMMENT ON TABLE microdao_treasury IS 'Token balances for microDAOs';
COMMENT ON COLUMN microdao_treasury.balance IS 'Token balance with 8 decimal precision';

-- ============================================================================
-- Table: microdao_settings
-- Purpose: Key-value settings for microDAOs
-- ============================================================================

CREATE TABLE IF NOT EXISTS microdao_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    microdao_id UUID NOT NULL REFERENCES microdaos(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(microdao_id, key)
);

CREATE INDEX idx_microdao_settings_microdao_id ON microdao_settings(microdao_id);

COMMENT ON TABLE microdao_settings IS 'Key-value settings for microDAOs';
COMMENT ON COLUMN microdao_settings.key IS 'visibility, join_mode, default_agent_id, etc.';

-- ============================================================================
-- Update Trigger: microdaos.updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_microdaos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_microdaos_updated_at
    BEFORE UPDATE ON microdaos
    FOR EACH ROW
    EXECUTE FUNCTION update_microdaos_updated_at();

-- ============================================================================
-- Seed Data: Sample microDAOs
-- ============================================================================

-- Insert DAARION microDAO
INSERT INTO microdaos (external_id, slug, name, description, owner_user_id)
SELECT 
    'microdao:daarion',
    'daarion-city',
    'DAARION Core',
    'Децентралізована платформа для AI-агентів та microDAO',
    id
FROM users
WHERE email = 'admin@daarion.xyz' OR id = (SELECT id FROM users LIMIT 1)
LIMIT 1
ON CONFLICT (external_id) DO NOTHING;

-- Add owner as member with owner role
INSERT INTO microdao_members (microdao_id, user_id, role)
SELECT 
    m.id,
    m.owner_user_id,
    'owner'
FROM microdaos m
WHERE m.external_id = 'microdao:daarion'
ON CONFLICT (microdao_id, user_id) DO NOTHING;

-- Initialize treasury with DAARION token
INSERT INTO microdao_treasury (microdao_id, token_symbol, balance)
SELECT 
    id,
    'DAARION',
    1000000.0
FROM microdaos
WHERE external_id = 'microdao:daarion'
ON CONFLICT (microdao_id, token_symbol) DO NOTHING;

-- Add default settings
INSERT INTO microdao_settings (microdao_id, key, value)
SELECT 
    id,
    'visibility',
    '"public"'::jsonb
FROM microdaos
WHERE external_id = 'microdao:daarion'
ON CONFLICT (microdao_id, key) DO NOTHING;

INSERT INTO microdao_settings (microdao_id, key, value)
SELECT 
    id,
    'join_mode',
    '"request"'::jsonb
FROM microdaos
WHERE external_id = 'microdao:daarion'
ON CONFLICT (microdao_id, key) DO NOTHING;

-- ============================================================================
-- Link existing agents to DAARION microDAO (if not already linked)
-- ============================================================================

UPDATE agents
SET microdao_id = (SELECT id FROM microdaos WHERE external_id = 'microdao:daarion' LIMIT 1)
WHERE external_id IN ('agent:sofia', 'agent:alex', 'agent:guardian')
  AND microdao_id IS NULL;

-- ============================================================================
-- Grants
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON microdaos TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON microdao_members TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON microdao_treasury TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON microdao_settings TO postgres;

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name IN ('microdaos', 'microdao_members', 'microdao_treasury', 'microdao_settings')
    ) THEN
        RAISE NOTICE 'Migration 008: microDAO Core Tables created successfully';
    ELSE
        RAISE EXCEPTION 'Migration 008: Failed to create tables';
    END IF;
END $$;

