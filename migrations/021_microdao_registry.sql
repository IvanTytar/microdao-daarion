-- 1. Update microdaos table structure
ALTER TABLE microdaos
    ADD COLUMN IF NOT EXISTS district text,
    ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_microdaos_district ON microdaos(district);

-- 2. Create microdao_agents table
CREATE TABLE IF NOT EXISTS microdao_agents (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    microdao_id     text NOT NULL REFERENCES microdaos(id) ON DELETE CASCADE,
    agent_id        text NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    role            text,
    is_core         boolean NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE(microdao_id, agent_id)
);

-- 3. Create microdao_channels table
CREATE TABLE IF NOT EXISTS microdao_channels (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    microdao_id     text NOT NULL REFERENCES microdaos(id) ON DELETE CASCADE,
    kind            text NOT NULL,
    ref_id          text NOT NULL,
    display_name    text,
    is_primary      boolean NOT NULL DEFAULT false,
    extra           jsonb DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_microdao_channels_microdao ON microdao_channels(microdao_id);

-- 4. Seed Data Updates
-- Update districts
UPDATE microdaos SET district = 'Core' WHERE slug = 'daarion';
UPDATE microdaos SET district = 'Energy' WHERE slug = 'energy-union';
UPDATE microdaos SET district = 'Green' WHERE slug = 'greenfood';
UPDATE microdaos SET district = 'Clan' WHERE slug = 'clan';
UPDATE microdaos SET district = 'Soul' WHERE slug = 'soul';
UPDATE microdaos SET district = 'Council' WHERE slug = 'yaromir';
UPDATE microdaos SET district = 'Labs' WHERE slug = 'druid';
UPDATE microdaos SET district = 'Labs' WHERE slug = 'nutra';
UPDATE microdaos SET district = 'Creators' WHERE slug = 'eonarch';

-- Link orchestrators as core agents
INSERT INTO microdao_agents (microdao_id, agent_id, role, is_core)
SELECT id, owner_agent_id, 'orchestrator', true
FROM microdaos
WHERE owner_agent_id IS NOT NULL
ON CONFLICT (microdao_id, agent_id) DO NOTHING;

-- Seed basic Telegram channels (assumed based on slug)
INSERT INTO microdao_channels (microdao_id, kind, ref_id, display_name, is_primary)
SELECT id, 'telegram', '@' || replace(slug, '-', '') || 'bot', name || ' Telegram Bot', true
FROM microdaos
WHERE NOT EXISTS (
    SELECT 1 FROM microdao_channels WHERE microdao_id = microdaos.id AND kind = 'telegram'
);

