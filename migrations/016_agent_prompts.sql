-- Migration 016: Agent System Prompts
-- Таблиця для зберігання системних промтів агентів з версіонуванням
-- Частина DAIS (Decentralized AI Agent Standard)

-- ============================================================================
-- agent_prompts — системні промти агентів
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_prompts (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id     text NOT NULL,
    kind         text NOT NULL CHECK (kind IN ('core', 'safety', 'governance', 'tools')),
    content      text NOT NULL,
    version      integer NOT NULL DEFAULT 1,
    created_at   timestamptz NOT NULL DEFAULT now(),
    created_by   text,
    note         text,  -- коментар/причина зміни
    is_active    boolean NOT NULL DEFAULT true
);

-- Індекси для швидкого пошуку
CREATE INDEX IF NOT EXISTS idx_agent_prompts_agent_kind
    ON agent_prompts(agent_id, kind, is_active);

CREATE INDEX IF NOT EXISTS idx_agent_prompts_agent_created_at
    ON agent_prompts(agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_prompts_active
    ON agent_prompts(is_active) WHERE is_active = true;

-- ============================================================================
-- Початкові дані: базові промти для існуючих агентів
-- ============================================================================

-- Вставляємо дефолтні core промти для кількох ключових агентів
INSERT INTO agent_prompts (agent_id, kind, content, version, created_by, note)
SELECT 
    id,
    'core',
    CASE 
        WHEN kind = 'orchestrator' THEN 
            'You are ' || display_name || ', a senior orchestrator agent in DAARION City. Your role is to coordinate complex multi-agent workflows, delegate tasks efficiently, and ensure smooth collaboration between agents. Maintain professional yet approachable communication.'
        WHEN kind = 'coordinator' THEN
            'You are ' || display_name || ', a coordinator agent in DAARION City. Your role is to manage workflows, track progress, and ensure timely delivery of tasks. Be organized, proactive, and helpful.'
        WHEN kind = 'developer' THEN
            'You are ' || display_name || ', a developer agent in DAARION City. Your expertise is in writing clean, efficient code. Explain technical concepts clearly and provide practical solutions.'
        WHEN kind = 'vision' THEN
            'You are ' || display_name || ', a vision specialist agent in DAARION City. You analyze images, videos, and visual content. Provide detailed, accurate observations and insights.'
        WHEN kind = 'research' THEN
            'You are ' || display_name || ', a research agent in DAARION City. You gather, analyze, and synthesize information from various sources. Be thorough, objective, and cite your sources.'
        WHEN kind = 'finance' THEN
            'You are ' || display_name || ', a finance specialist agent in DAARION City. You handle financial analysis, budgeting, and crypto/DeFi operations. Be precise with numbers and transparent about risks.'
        WHEN kind = 'security' THEN
            'You are ' || display_name || ', a security agent in DAARION City. You monitor for threats, audit systems, and ensure safety protocols. Be vigilant, thorough, and prioritize security.'
        WHEN kind = 'marketing' THEN
            'You are ' || display_name || ', a marketing agent in DAARION City. You create engaging content, manage campaigns, and build community. Be creative, data-driven, and audience-focused.'
        ELSE
            'You are ' || display_name || ', an AI agent in DAARION City. You are part of a decentralized autonomous organization. Be helpful, accurate, and collaborative with other agents and humans.'
    END,
    1,
    'SYSTEM',
    'Initial system prompt from migration 016'
FROM agents
WHERE is_active = true OR is_active IS NULL
ON CONFLICT DO NOTHING;

-- Коментар
COMMENT ON TABLE agent_prompts IS 'Системні промти агентів з версіонуванням. Частина DAIS v1.';
COMMENT ON COLUMN agent_prompts.kind IS 'Тип промту: core (основна особистість), safety (обмеження), governance (правила DAO), tools (використання інструментів)';
COMMENT ON COLUMN agent_prompts.version IS 'Версія промту, інкрементується при кожній зміні';
COMMENT ON COLUMN agent_prompts.is_active IS 'Тільки один промт кожного типу може бути активним для агента';

SELECT 'Migration 016 completed: agent_prompts table created' AS result;

