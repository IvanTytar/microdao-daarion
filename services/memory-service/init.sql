-- Memory Service Database Schema
-- Created: 2025-01-16

-- User facts table
CREATE TABLE IF NOT EXISTS user_facts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    team_id VARCHAR(255),
    fact_key VARCHAR(255) NOT NULL,
    fact_value TEXT,
    fact_value_json JSONB,
    token_gated BOOLEAN DEFAULT FALSE,
    token_requirements JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, team_id, fact_key)
);

-- Dialog summaries table
CREATE TABLE IF NOT EXISTS dialog_summaries (
    id SERIAL PRIMARY KEY,
    team_id VARCHAR(255) NOT NULL,
    channel_id VARCHAR(255),
    agent_id VARCHAR(255),
    user_id VARCHAR(255),
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    summary_text TEXT,
    summary_json JSONB,
    message_count INTEGER DEFAULT 0,
    participant_count INTEGER DEFAULT 0,
    topics TEXT[],
    meta JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent memory events table
CREATE TABLE IF NOT EXISTS agent_memory_events (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(255) NOT NULL,
    team_id VARCHAR(255) NOT NULL,
    channel_id VARCHAR(255),
    user_id VARCHAR(255),
    scope VARCHAR(50) DEFAULT 'short_term',
    kind VARCHAR(50) NOT NULL,
    body_text TEXT,
    body_json JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_facts_user_team ON user_facts(user_id, team_id);
CREATE INDEX IF NOT EXISTS idx_dialog_summaries_team_channel ON dialog_summaries(team_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_events_agent_team ON agent_memory_events(agent_id, team_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_events_created ON agent_memory_events(created_at DESC);

-- Update trigger for user_facts
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_facts_updated_at BEFORE UPDATE ON user_facts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
