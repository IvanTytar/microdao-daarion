-- ============================================================================
-- Migration 009: DAO Core Tables
-- Phase 8: DAO Dashboard (Governance + Treasury + Voting)
-- ============================================================================

-- ============================================================================
-- Table: dao
-- Purpose: DAO entities with governance configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS dao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    microdao_id UUID NOT NULL REFERENCES microdaos(id) ON DELETE CASCADE,
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    governance_model TEXT NOT NULL DEFAULT 'simple', -- 'simple' | 'quadratic' | 'delegated'
    voting_period_seconds INTEGER NOT NULL DEFAULT 604800, -- 7 days
    quorum_percent INTEGER NOT NULL DEFAULT 20, -- 20%
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dao_microdao_id ON dao(microdao_id);
CREATE INDEX idx_dao_owner_user_id ON dao(owner_user_id);
CREATE INDEX idx_dao_is_active ON dao(is_active);

COMMENT ON TABLE dao IS 'DAO entities with governance configuration';
COMMENT ON COLUMN dao.governance_model IS 'simple, quadratic, or delegated voting';
COMMENT ON COLUMN dao.voting_period_seconds IS 'Default voting period for proposals';
COMMENT ON COLUMN dao.quorum_percent IS 'Minimum participation percentage for valid vote';

-- ============================================================================
-- Table: dao_members
-- Purpose: DAO membership with roles
-- ============================================================================

CREATE TABLE IF NOT EXISTS dao_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dao_id UUID NOT NULL REFERENCES dao(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'owner' | 'admin' | 'member' | 'guest'
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(dao_id, user_id)
);

CREATE INDEX idx_dao_members_user_id ON dao_members(user_id);
CREATE INDEX idx_dao_members_dao_id ON dao_members(dao_id);
CREATE INDEX idx_dao_members_dao_id_role ON dao_members(dao_id, role);

COMMENT ON TABLE dao_members IS 'DAO membership with roles';
COMMENT ON COLUMN dao_members.role IS 'owner, admin, member, guest';

-- ============================================================================
-- Table: dao_treasury
-- Purpose: Token balances for DAO treasury
-- ============================================================================

CREATE TABLE IF NOT EXISTS dao_treasury (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dao_id UUID NOT NULL REFERENCES dao(id) ON DELETE CASCADE,
    token_symbol TEXT NOT NULL,
    contract_address TEXT,
    balance NUMERIC(30, 8) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(dao_id, token_symbol)
);

CREATE INDEX idx_dao_treasury_dao_id ON dao_treasury(dao_id);

COMMENT ON TABLE dao_treasury IS 'Token balances for DAO treasury';
COMMENT ON COLUMN dao_treasury.balance IS 'Token balance with 8 decimal precision';
COMMENT ON COLUMN dao_treasury.contract_address IS 'Optional smart contract address';

-- ============================================================================
-- Table: dao_proposals
-- Purpose: Governance proposals for voting
-- ============================================================================

CREATE TABLE IF NOT EXISTS dao_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dao_id UUID NOT NULL REFERENCES dao(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft' | 'active' | 'passed' | 'rejected' | 'executed'
    governance_model_override TEXT,
    quorum_percent_override INTEGER,
    UNIQUE(dao_id, slug)
);

CREATE INDEX idx_dao_proposals_dao_id ON dao_proposals(dao_id);
CREATE INDEX idx_dao_proposals_status ON dao_proposals(status);
CREATE INDEX idx_dao_proposals_created_by ON dao_proposals(created_by_user_id);

COMMENT ON TABLE dao_proposals IS 'Governance proposals for voting';
COMMENT ON COLUMN dao_proposals.status IS 'draft, active, passed, rejected, executed';
COMMENT ON COLUMN dao_proposals.governance_model_override IS 'Override DAO default governance model';

-- ============================================================================
-- Table: dao_votes
-- Purpose: Individual votes on proposals
-- ============================================================================

CREATE TABLE IF NOT EXISTS dao_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES dao_proposals(id) ON DELETE CASCADE,
    voter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vote_value TEXT NOT NULL, -- 'yes' | 'no' | 'abstain'
    weight NUMERIC(30, 8) NOT NULL, -- actual weight after applying governance model
    raw_power NUMERIC(30, 8), -- raw voting power before governance model
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(proposal_id, voter_user_id)
);

CREATE INDEX idx_dao_votes_proposal_id ON dao_votes(proposal_id);
CREATE INDEX idx_dao_votes_voter_user_id ON dao_votes(voter_user_id);

COMMENT ON TABLE dao_votes IS 'Individual votes on proposals';
COMMENT ON COLUMN dao_votes.vote_value IS 'yes, no, abstain';
COMMENT ON COLUMN dao_votes.weight IS 'Calculated weight after governance model';
COMMENT ON COLUMN dao_votes.raw_power IS 'Raw voting power before calculation';

-- ============================================================================
-- Table: dao_roles
-- Purpose: Custom roles for DAO
-- ============================================================================

CREATE TABLE IF NOT EXISTS dao_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dao_id UUID NOT NULL REFERENCES dao(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(dao_id, code)
);

CREATE INDEX idx_dao_roles_dao_id ON dao_roles(dao_id);

COMMENT ON TABLE dao_roles IS 'Custom roles for DAO';
COMMENT ON COLUMN dao_roles.code IS 'Unique role code (e.g., treasury_manager)';

-- ============================================================================
-- Table: dao_role_assignments
-- Purpose: Custom role assignments to users
-- ============================================================================

CREATE TABLE IF NOT EXISTS dao_role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dao_id UUID NOT NULL REFERENCES dao(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_code TEXT NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(dao_id, user_id, role_code)
);

CREATE INDEX idx_dao_role_assignments_user_id ON dao_role_assignments(user_id);
CREATE INDEX idx_dao_role_assignments_dao_id ON dao_role_assignments(dao_id);

COMMENT ON TABLE dao_role_assignments IS 'Custom role assignments to users';

-- ============================================================================
-- Table: dao_audit_log
-- Purpose: Audit log for all DAO actions
-- ============================================================================

CREATE TABLE IF NOT EXISTS dao_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dao_id UUID NOT NULL REFERENCES dao(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    event_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dao_audit_log_dao_id ON dao_audit_log(dao_id);
CREATE INDEX idx_dao_audit_log_created_at ON dao_audit_log(created_at DESC);
CREATE INDEX idx_dao_audit_log_event_type ON dao_audit_log(event_type);

COMMENT ON TABLE dao_audit_log IS 'Audit log for all DAO actions';
COMMENT ON COLUMN dao_audit_log.event_type IS 'Type of event (created, updated, voted, etc.)';

-- ============================================================================
-- Update Trigger: dao.updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_dao_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dao_updated_at
    BEFORE UPDATE ON dao
    FOR EACH ROW
    EXECUTE FUNCTION update_dao_updated_at();

-- ============================================================================
-- Seed Data: Sample DAO for DAARION microDAO
-- ============================================================================

-- Create DAO for DAARION microDAO
INSERT INTO dao (slug, name, description, microdao_id, owner_user_id, governance_model, quorum_percent)
SELECT 
    'daarion-governance',
    'DAARION Governance',
    'Децентралізоване управління екосистемою DAARION',
    m.id,
    m.owner_user_id,
    'simple',
    20
FROM microdaos m
WHERE m.external_id = 'microdao:daarion'
LIMIT 1
ON CONFLICT (slug) DO NOTHING;

-- Add owner as DAO member
INSERT INTO dao_members (dao_id, user_id, role)
SELECT 
    d.id,
    d.owner_user_id,
    'owner'
FROM dao d
WHERE d.slug = 'daarion-governance'
ON CONFLICT (dao_id, user_id) DO NOTHING;

-- Initialize DAO treasury with DAARION token
INSERT INTO dao_treasury (dao_id, token_symbol, balance)
SELECT 
    d.id,
    'DAARION',
    1000000.0
FROM dao d
WHERE d.slug = 'daarion-governance'
ON CONFLICT (dao_id, token_symbol) DO NOTHING;

-- Create sample proposal
INSERT INTO dao_proposals (dao_id, slug, title, description, created_by_user_id, status, start_at, end_at)
SELECT 
    d.id,
    'proposal-1-funding',
    'Фінансування розвитку Agent Hub',
    'Пропозиція виділити 10,000 DAARION токенів на розвиток Agent Hub у Q1 2025',
    d.owner_user_id,
    'active',
    NOW(),
    NOW() + INTERVAL '7 days'
FROM dao d
WHERE d.slug = 'daarion-governance'
ON CONFLICT (dao_id, slug) DO NOTHING;

-- ============================================================================
-- Grants
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON dao TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON dao_members TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON dao_treasury TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON dao_proposals TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON dao_votes TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON dao_roles TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON dao_role_assignments TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON dao_audit_log TO postgres;

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name IN ('dao', 'dao_members', 'dao_treasury', 'dao_proposals', 'dao_votes')
    ) THEN
        RAISE NOTICE 'Migration 009: DAO Core Tables created successfully';
    ELSE
        RAISE EXCEPTION 'Migration 009: Failed to create tables';
    END IF;
END $$;

