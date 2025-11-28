-- Migration 014: Agent-City Integration
-- Date: 2025-11-27
-- Description: Adds tables and columns for agent-city integration

-- ============================================================================
-- 1. Create districts table
-- ============================================================================
CREATE TABLE IF NOT EXISTS city_districts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366F1',
    icon TEXT DEFAULT 'building',
    room_slug TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. Add new columns to agents table (if not exists)
-- ============================================================================
ALTER TABLE agents ADD COLUMN IF NOT EXISTS node_id TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS primary_room_slug TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS color_hint TEXT;

-- Rename 'id' to 'agent_id' style (keep both for compatibility)
-- Note: The table uses 'id' as primary key, we'll use it as agent_id in code

-- ============================================================================
-- 3. Create agent_room_bindings table
-- ============================================================================
CREATE TABLE IF NOT EXISTS agent_room_bindings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'resident',
    is_primary BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_room_bindings_agent
    ON agent_room_bindings(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_room_bindings_room
    ON agent_room_bindings(room_id);

-- ============================================================================
-- 4. Insert default districts
-- ============================================================================
INSERT INTO city_districts (id, name, description, color, icon, room_slug) VALUES
    ('leadership', 'Leadership Hall', 'Центр управління DAARION DAO — CEO, CTO, COO', '#F59E0B', 'crown', 'leadership-hall'),
    ('system', 'System Control Center', 'Системні агенти та моніторинг інфраструктури', '#6366F1', 'cpu', 'system-control'),
    ('engineering', 'Engineering Lab', 'Розробка, код, архітектура', '#10B981', 'code', 'engineering-lab'),
    ('marketing', 'Marketing Hub', 'SMM, контент, комʼюніті', '#EC4899', 'megaphone', 'marketing-hub'),
    ('finance', 'Finance Office', 'Фінанси, бухгалтерія, бюджетування', '#14B8A6', 'banknotes', 'finance-office'),
    ('web3', 'Web3 District', 'Blockchain, DeFi, DAO governance', '#8B5CF6', 'cube', 'web3-district'),
    ('security', 'Security Bunker', 'Безпека, аудит, криптофорензика', '#EF4444', 'shield', 'security-bunker'),
    ('vision', 'Vision Studio', 'Мультимодальність, аналіз зображень', '#22D3EE', 'eye', 'vision-studio'),
    ('rnd', 'R&D Laboratory', 'Дослідження, експерименти, нові моделі', '#A855F7', 'beaker', 'rnd-lab'),
    ('memory', 'Memory Vault', 'Памʼять, знання, індексація', '#06B6D4', 'database', 'memory-vault')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    icon = EXCLUDED.icon,
    room_slug = EXCLUDED.room_slug,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- 5. Create city rooms for each district (if not exists)
-- ============================================================================
INSERT INTO city_rooms (id, slug, name, description, is_default, room_type, color) VALUES
    ('room_leadership_hall', 'leadership-hall', 'Leadership Hall', 'Центр управління DAARION DAO — CEO, CTO, COO', false, 'district', '#F59E0B'),
    ('room_system_control', 'system-control', 'System Control', 'Системні агенти та моніторинг інфраструктури', false, 'district', '#6366F1'),
    ('room_engineering_lab', 'engineering-lab', 'Engineering Lab', 'Розробка, код, архітектура', false, 'district', '#10B981'),
    ('room_marketing_hub', 'marketing-hub', 'Marketing Hub', 'SMM, контент, комʼюніті', false, 'district', '#EC4899'),
    ('room_finance_office', 'finance-office', 'Finance Office', 'Фінанси, бухгалтерія, бюджетування', false, 'district', '#14B8A6'),
    ('room_web3_district', 'web3-district', 'Web3 District', 'Blockchain, DeFi, DAO governance', false, 'district', '#8B5CF6'),
    ('room_security_bunker', 'security-bunker', 'Security Bunker', 'Безпека, аудит, криптофорензика', false, 'district', '#EF4444'),
    ('room_vision_studio', 'vision-studio', 'Vision Studio', 'Мультимодальність, аналіз зображень', false, 'district', '#22D3EE'),
    ('room_rnd_lab', 'rnd-lab', 'R&D Laboratory', 'Дослідження, експерименти, нові моделі', false, 'district', '#A855F7'),
    ('room_memory_vault', 'memory-vault', 'Memory Vault', 'Памʼять, знання, індексація', false, 'district', '#06B6D4')
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    room_type = EXCLUDED.room_type,
    color = EXCLUDED.color;

-- ============================================================================
-- 6. Add map coordinates for new district rooms
-- ============================================================================
UPDATE city_rooms SET map_x = 2, map_y = 0, map_w = 2, map_h = 1 WHERE slug = 'leadership-hall';
UPDATE city_rooms SET map_x = 0, map_y = 1, map_w = 1, map_h = 1 WHERE slug = 'system-control';
UPDATE city_rooms SET map_x = 1, map_y = 1, map_w = 1, map_h = 1 WHERE slug = 'engineering-lab';
UPDATE city_rooms SET map_x = 2, map_y = 1, map_w = 1, map_h = 1 WHERE slug = 'marketing-hub';
UPDATE city_rooms SET map_x = 3, map_y = 1, map_w = 1, map_h = 1 WHERE slug = 'finance-office';
UPDATE city_rooms SET map_x = 0, map_y = 2, map_w = 1, map_h = 1 WHERE slug = 'web3-district';
UPDATE city_rooms SET map_x = 1, map_y = 2, map_w = 1, map_h = 1 WHERE slug = 'security-bunker';
UPDATE city_rooms SET map_x = 2, map_y = 2, map_w = 1, map_h = 1 WHERE slug = 'vision-studio';
UPDATE city_rooms SET map_x = 3, map_y = 2, map_w = 1, map_h = 1 WHERE slug = 'rnd-lab';
UPDATE city_rooms SET map_x = 0, map_y = 3, map_w = 2, map_h = 1 WHERE slug = 'memory-vault';

-- Done!
SELECT 'Migration 014 completed: Agent-City Integration' as result;

