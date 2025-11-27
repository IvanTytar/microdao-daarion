-- migrations/005_create_usage_tables.sql
-- Usage Engine Database Schema

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- LLM Usage Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_llm (
  event_id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL, -- 'human', 'agent', 'service'
  agent_id TEXT,
  microdao_id TEXT,
  model TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'openai', 'deepseek', 'local'
  prompt_tokens INT NOT NULL,
  completion_tokens INT NOT NULL,
  total_tokens INT NOT NULL,
  latency_ms INT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT true,
  error TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_usage_llm_timestamp ON usage_llm(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_llm_microdao ON usage_llm(microdao_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_llm_agent ON usage_llm(agent_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_llm_model ON usage_llm(model, timestamp DESC);

-- ============================================================================
-- Tool Usage Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_tool (
  event_id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  agent_id TEXT,
  microdao_id TEXT,
  tool_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  latency_ms INT NOT NULL,
  error TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_usage_tool_timestamp ON usage_tool(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_tool_microdao ON usage_tool(microdao_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_tool_id ON usage_tool(tool_id, timestamp DESC);

-- ============================================================================
-- Agent Invocation Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_agent (
  event_id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  agent_id TEXT NOT NULL,
  microdao_id TEXT,
  channel_id TEXT,
  trigger TEXT NOT NULL, -- 'message', 'scheduled', 'manual'
  duration_ms INT NOT NULL,
  llm_calls INT DEFAULT 0,
  tool_calls INT DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  error TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_usage_agent_timestamp ON usage_agent(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_agent_id ON usage_agent(agent_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_agent_microdao ON usage_agent(microdao_id, timestamp DESC);

-- ============================================================================
-- Message Usage Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_message (
  event_id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  microdao_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_length INT NOT NULL,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_usage_message_timestamp ON usage_message(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_message_microdao ON usage_message(microdao_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_usage_message_channel ON usage_message(channel_id, timestamp DESC);

-- ============================================================================
-- Security Audit Log (from PDP Service)
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  decision TEXT NOT NULL, -- 'permit' or 'deny'
  reason TEXT,
  context JSONB
);

CREATE INDEX IF NOT EXISTS idx_security_audit_timestamp ON security_audit(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_actor ON security_audit(actor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_decision ON security_audit(decision, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_resource ON security_audit(resource_type, resource_id, timestamp DESC);

-- ============================================================================
-- Sample Data (for testing)
-- ============================================================================

-- Sample LLM usage (Sofia responding to a message)
INSERT INTO usage_llm (event_id, timestamp, actor_id, actor_type, agent_id, microdao_id, model, provider, prompt_tokens, completion_tokens, total_tokens, latency_ms, success)
VALUES 
  ('llm-test-1', now() - interval '1 hour', 'agent:sofia', 'agent', 'agent:sofia', 'microdao:daarion', 'gpt-4.1-mini', 'openai', 450, 120, 570, 1250, true),
  ('llm-test-2', now() - interval '30 minutes', 'agent:sofia', 'agent', 'agent:sofia', 'microdao:daarion', 'gpt-4.1-mini', 'openai', 380, 95, 475, 1100, true)
ON CONFLICT (event_id) DO NOTHING;

-- Sample tool usage
INSERT INTO usage_tool (event_id, timestamp, actor_id, actor_type, agent_id, microdao_id, tool_id, tool_name, success, latency_ms)
VALUES 
  ('tool-test-1', now() - interval '45 minutes', 'agent:sofia', 'agent', 'agent:sofia', 'microdao:daarion', 'projects.list', 'List Projects', true, 450),
  ('tool-test-2', now() - interval '20 minutes', 'agent:sofia', 'agent', 'agent:sofia', 'microdao:daarion', 'task.create', 'Create Task', true, 320)
ON CONFLICT (event_id) DO NOTHING;

-- Sample agent invocations
INSERT INTO usage_agent (event_id, timestamp, agent_id, microdao_id, trigger, duration_ms, llm_calls, tool_calls, success)
VALUES 
  ('agent-test-1', now() - interval '1 hour', 'agent:sofia', 'microdao:daarion', 'message', 3450, 2, 1, true),
  ('agent-test-2', now() - interval '30 minutes', 'agent:sofia', 'microdao:daarion', 'message', 2100, 1, 0, true)
ON CONFLICT (event_id) DO NOTHING;

-- Sample security audit
INSERT INTO security_audit (actor_id, actor_type, action, resource_type, resource_id, decision, reason)
VALUES 
  ('user:93', 'human', 'send_message', 'channel', 'channel-general', 'permit', 'channel_member'),
  ('agent:sofia', 'agent', 'exec_tool', 'tool', 'projects.list', 'permit', 'tool_allowed_agent')
ON CONFLICT (id) DO NOTHING;




