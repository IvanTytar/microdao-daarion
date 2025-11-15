-- Міграція для Memory Service
-- Створює таблиці: user_facts, dialog_summaries, agent_memory_events, agent_memory_facts_vector

-- Розширення для UUID та vector
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ========== User Facts ==========
CREATE TABLE IF NOT EXISTS user_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,  -- Без FK constraint для тестування
    team_id TEXT,  -- Без FK constraint, оскільки teams може не існувати
    
    -- Ключ факту (наприклад: "language", "is_donor", "is_validator", "top_contributor")
    fact_key TEXT NOT NULL,
    
    -- Значення факту
    fact_value TEXT,
    fact_value_json JSONB,
    
    -- Метадані
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Токен-гейт
    token_gated BOOLEAN NOT NULL DEFAULT false,
    token_requirements JSONB,
    
    -- Таймстемпи
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_facts_user_id ON user_facts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_facts_team_id ON user_facts(team_id);
CREATE INDEX IF NOT EXISTS idx_user_facts_user_key ON user_facts(user_id, fact_key);
CREATE INDEX IF NOT EXISTS idx_user_facts_token_gated ON user_facts(token_gated);
CREATE INDEX IF NOT EXISTS idx_user_facts_expires_at ON user_facts(expires_at) WHERE expires_at IS NOT NULL;

-- ========== Dialog Summaries ==========
CREATE TABLE IF NOT EXISTS dialog_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Контекст діалогу (без FK constraints для тестування)
    team_id TEXT NOT NULL,
    channel_id TEXT,
    agent_id TEXT,
    user_id TEXT,
    
    -- Період
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Підсумок
    summary_text TEXT NOT NULL,
    summary_json JSONB,
    
    -- Статистика
    message_count INTEGER NOT NULL DEFAULT 0,
    participant_count INTEGER NOT NULL DEFAULT 0,
    
    -- Ключові теми
    topics JSONB,
    
    -- Метадані
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dialog_summaries_team_id ON dialog_summaries(team_id);
CREATE INDEX IF NOT EXISTS idx_dialog_summaries_channel_id ON dialog_summaries(channel_id);
CREATE INDEX IF NOT EXISTS idx_dialog_summaries_agent_id ON dialog_summaries(agent_id);
CREATE INDEX IF NOT EXISTS idx_dialog_summaries_user_id ON dialog_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_dialog_summaries_team_period ON dialog_summaries(team_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_dialog_summaries_created_at ON dialog_summaries(created_at);

-- ========== Agent Memory Events ==========
CREATE TABLE IF NOT EXISTS agent_memory_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Без FK constraints для тестування
    agent_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    channel_id TEXT,
    user_id TEXT,
    
    -- Scope: short_term, mid_term, long_term
    scope TEXT NOT NULL CHECK (scope IN ('short_term', 'mid_term', 'long_term')),
    
    -- Kind: message, fact, summary, note
    kind TEXT NOT NULL CHECK (kind IN ('message', 'fact', 'summary', 'note')),
    
    -- Тіло події
    body_text TEXT,
    body_json JSONB,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_memory_events_agent_id ON agent_memory_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_events_team_id ON agent_memory_events(team_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_events_channel_id ON agent_memory_events(channel_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_events_user_id ON agent_memory_events(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_events_agent_team_scope ON agent_memory_events(agent_id, team_id, scope);
CREATE INDEX IF NOT EXISTS idx_agent_memory_events_channel ON agent_memory_events(agent_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_events_created_at ON agent_memory_events(created_at);

-- ========== Agent Memory Facts Vector (для RAG) ==========
CREATE TABLE IF NOT EXISTS agent_memory_facts_vector (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Без FK constraints для тестування
    agent_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    
    fact_text TEXT NOT NULL,
    embedding vector(1536),  -- OpenAI ada-002 embedding size
    
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_memory_facts_vector_agent_id ON agent_memory_facts_vector(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_facts_vector_team_id ON agent_memory_facts_vector(team_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_facts_vector_agent_team ON agent_memory_facts_vector(agent_id, team_id);

-- Індекс для векторного пошуку (використовується pgvector)
-- Примітка: Створіть цей індекс після того, як у вас буде достатньо даних
-- CREATE INDEX IF NOT EXISTS idx_agent_memory_facts_vector_embedding 
-- ON agent_memory_facts_vector USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

