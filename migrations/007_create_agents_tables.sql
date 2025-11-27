-- ============================================================================
-- Migration 007: Agent Lifecycle Tables
-- Phase 6: CRUD + DB Persistence + Events
-- ============================================================================

-- ============================================================================
-- Table: agent_blueprints
-- Purpose: Agent templates/archetypes (Sofia, Alex, Guardian, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_blueprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    default_model TEXT NOT NULL DEFAULT 'gpt-4.1-mini',
    default_tools JSONB DEFAULT '[]'::jsonb,
    default_system_prompt TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_blueprints_code ON agent_blueprints(code);

COMMENT ON TABLE agent_blueprints IS 'Agent templates/archetypes';
COMMENT ON COLUMN agent_blueprints.code IS 'Unique code like sofia_prime, alex_analyst';
COMMENT ON COLUMN agent_blueprints.default_tools IS 'JSON array of default tool IDs';

-- ============================================================================
-- Table: agents
-- Purpose: Agent instances (actual agents in the system)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    microdao_id UUID REFERENCES microdaos(id) ON DELETE SET NULL,
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    blueprint_id UUID REFERENCES agent_blueprints(id) ON DELETE SET NULL,
    model TEXT NOT NULL DEFAULT 'gpt-4.1-mini',
    tools_enabled JSONB DEFAULT '[]'::jsonb,
    system_prompt TEXT,
    avatar_url TEXT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agents_external_id ON agents(external_id);
CREATE INDEX idx_agents_owner_user_id ON agents(owner_user_id);
CREATE INDEX idx_agents_microdao_id ON agents(microdao_id);
CREATE INDEX idx_agents_kind ON agents(kind);
CREATE INDEX idx_agents_is_active ON agents(is_active);

COMMENT ON TABLE agents IS 'Agent instances in the system';
COMMENT ON COLUMN agents.external_id IS 'External identifier like agent:sofia';
COMMENT ON COLUMN agents.kind IS 'assistant, node, system, guardian, analyst, quest';
COMMENT ON COLUMN agents.tools_enabled IS 'JSON array of enabled tool IDs';
COMMENT ON COLUMN agents.is_active IS 'Soft delete flag';

-- ============================================================================
-- Table: agent_events
-- Purpose: Event log for agent activity
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    kind TEXT NOT NULL,
    channel_id TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_events_agent_id ON agent_events(agent_id);
CREATE INDEX idx_agent_events_agent_id_ts ON agent_events(agent_id, ts DESC);
CREATE INDEX idx_agent_events_kind ON agent_events(kind);
CREATE INDEX idx_agent_events_ts ON agent_events(ts DESC);

COMMENT ON TABLE agent_events IS 'Event log for agent activity';
COMMENT ON COLUMN agent_events.kind IS 'created, updated, deleted, invocation, reply_sent, tool_call, error, etc.';
COMMENT ON COLUMN agent_events.payload IS 'Event-specific data (JSON)';

-- ============================================================================
-- Seed Data: Agent Blueprints
-- ============================================================================

INSERT INTO agent_blueprints (code, name, description, default_model, default_tools, default_system_prompt)
VALUES 
    (
        'sofia_prime',
        'Sofia',
        'Універсальний асистент для проєктів та задач',
        'gpt-4.1-mini',
        '["projects.list", "task.create", "task.list", "followups.create"]'::jsonb,
        'You are Sofia, a helpful assistant for managing projects and tasks.'
    ),
    (
        'alex_analyst',
        'Alex',
        'Аналітик даних та метрик',
        'deepseek-r1',
        '["metrics.get", "analytics.run", "reports.generate"]'::jsonb,
        'You are Alex, a data analyst specialized in metrics and insights.'
    ),
    (
        'guardian',
        'Guardian',
        'Захисник безпеки та compliance',
        'gpt-4.1-mini',
        '["security.check", "compliance.verify", "alerts.send"]'::jsonb,
        'You are Guardian, a security and compliance specialist.'
    ),
    (
        'quest_master',
        'Quest Master',
        'Координатор квестів та завдань',
        'gpt-4.1-mini',
        '["quest.create", "quest.update", "rewards.allocate"]'::jsonb,
        'You are Quest Master, a coordinator for quests and achievements.'
    ),
    (
        'node_monitor',
        'Node Monitor',
        'Моніторинг нод та системних метрик',
        'gpt-4.1-mini',
        '["node.status", "metrics.collect", "alerts.trigger"]'::jsonb,
        'You are Node Monitor, responsible for infrastructure monitoring.'
    )
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- Seed Data: Initial Agents (for testing)
-- ============================================================================

-- Insert Sofia instance
INSERT INTO agents (
    external_id, 
    name, 
    kind, 
    blueprint_id, 
    model, 
    tools_enabled,
    system_prompt,
    description,
    is_active
)
SELECT
    'agent:sofia',
    'Sofia',
    'assistant',
    id,
    'gpt-4.1-mini',
    '["projects.list", "task.create"]'::jsonb,
    'You are Sofia, a helpful assistant for managing projects and tasks.',
    'Допомагає з управлінням проєктами та задачами',
    true
FROM agent_blueprints WHERE code = 'sofia_prime'
ON CONFLICT (external_id) DO NOTHING;

-- Insert Alex instance
INSERT INTO agents (
    external_id, 
    name, 
    kind, 
    blueprint_id, 
    model, 
    tools_enabled,
    system_prompt,
    description,
    is_active
)
SELECT
    'agent:alex',
    'Alex',
    'analyst',
    id,
    'deepseek-r1',
    '["metrics.get", "analytics.run"]'::jsonb,
    'You are Alex, a data analyst specialized in metrics and insights.',
    'Аналітик даних та метрик',
    true
FROM agent_blueprints WHERE code = 'alex_analyst'
ON CONFLICT (external_id) DO NOTHING;

-- Insert Guardian instance
INSERT INTO agents (
    external_id, 
    name, 
    kind, 
    blueprint_id, 
    model, 
    tools_enabled,
    system_prompt,
    description,
    is_active
)
SELECT
    'agent:guardian',
    'Guardian',
    'guardian',
    id,
    'gpt-4.1-mini',
    '["security.check", "compliance.verify"]'::jsonb,
    'You are Guardian, a security and compliance specialist.',
    'Захисник безпеки системи',
    true
FROM agent_blueprints WHERE code = 'guardian'
ON CONFLICT (external_id) DO NOTHING;

-- ============================================================================
-- Update Trigger: agents.updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_agents_updated_at();

-- ============================================================================
-- Grants (for daarion app user)
-- ============================================================================

-- Assuming app user is 'daarion' or 'postgres'
GRANT SELECT, INSERT, UPDATE, DELETE ON agent_blueprints TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON agents TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON agent_events TO postgres;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify tables created
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name IN ('agent_blueprints', 'agents', 'agent_events')
    ) THEN
        RAISE NOTICE 'Migration 007: Agent Lifecycle Tables created successfully';
    ELSE
        RAISE EXCEPTION 'Migration 007: Failed to create tables';
    END IF;
END $$;

