-- Migration 030: Node Guardian and Steward
-- Додає поля для прив'язки агентів Guardian/Steward до нод

-- 1. Розширити таблицю agents полями для ролей Guardian/Steward
ALTER TABLE agents
    ADD COLUMN IF NOT EXISTS is_node_guardian boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_node_steward boolean NOT NULL DEFAULT false;

-- 2. Розширити node_cache полями для прив'язки агентів
ALTER TABLE node_cache
    ADD COLUMN IF NOT EXISTS guardian_agent_id text,
    ADD COLUMN IF NOT EXISTS steward_agent_id text;

-- 3. Індекси для швидкого пошуку
CREATE INDEX IF NOT EXISTS idx_agents_is_node_guardian ON agents(is_node_guardian) WHERE is_node_guardian = true;
CREATE INDEX IF NOT EXISTS idx_agents_is_node_steward ON agents(is_node_steward) WHERE is_node_steward = true;

-- 4. Оновити існуючих Monitor Agent як Guardian
UPDATE agents
SET is_node_guardian = true
WHERE id IN ('monitor-node1', 'monitor-node2', 'agent-monitor-node1', 'agent-monitor-node2');

-- 5. Прив'язати Guardian до нод
UPDATE node_cache
SET guardian_agent_id = 'monitor-node2'
WHERE node_id = 'node-2-macbook-m4max';

UPDATE node_cache
SET guardian_agent_id = 'monitor-node1'
WHERE node_id = 'node-1-hetzner-gex44';

-- 6. Створити агентів Node Steward (якщо ще не існують)
INSERT INTO agents (
    id, display_name, kind, status, node_id, 
    is_public, is_node_steward, public_slug,
    created_at, updated_at
) VALUES 
(
    'node-steward-node1',
    'Node Steward (НОДА1)',
    'infra_ops',
    'online',
    'node-1-hetzner-gex44',
    true,
    true,
    'node-steward-node1',
    NOW(),
    NOW()
),
(
    'node-steward-node2',
    'Node Steward (НОДА2)',
    'infra_ops',
    'online',
    'node-2-macbook-m4max',
    true,
    true,
    'node-steward-node2',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    is_node_steward = true,
    kind = 'infra_ops',
    updated_at = NOW();

-- 7. Прив'язати Steward до нод
UPDATE node_cache
SET steward_agent_id = 'node-steward-node1'
WHERE node_id = 'node-1-hetzner-gex44';

UPDATE node_cache
SET steward_agent_id = 'node-steward-node2'
WHERE node_id = 'node-2-macbook-m4max';

-- 8. Переконатися, що Monitor Agent (NODE1) існує
INSERT INTO agents (
    id, display_name, kind, status, node_id,
    is_public, is_node_guardian, public_slug,
    created_at, updated_at
) VALUES (
    'monitor-node1',
    'Node Monitor (НОДА1)',
    'infra_monitor',
    'online',
    'node-1-hetzner-gex44',
    true,
    true,
    'monitor-node1',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    is_node_guardian = true,
    kind = 'infra_monitor',
    updated_at = NOW();

