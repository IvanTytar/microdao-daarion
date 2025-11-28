-- Migration 022: Normalize Agent node_id to match Node Registry
-- Приводимо node_id агентів до формату Node Registry

-- ============================================================================
-- Нормалізація node_id
-- ============================================================================

-- NODE1 → node-1-hetzner-gex44
UPDATE agents 
SET node_id = 'node-1-hetzner-gex44' 
WHERE node_id = 'NODE1' OR node_id = 'node1' OR node_id = 'Node1';

-- NODE2 → node-2-macbook-m4max  
UPDATE agents 
SET node_id = 'node-2-macbook-m4max' 
WHERE node_id = 'NODE2' OR node_id = 'node2' OR node_id = 'Node2';

-- Перевірка
SELECT node_id, COUNT(*) as count 
FROM agents 
WHERE node_id IS NOT NULL 
GROUP BY node_id 
ORDER BY count DESC;

-- ============================================================================
-- Створюємо таблицю-кеш для нод в БД daarion
-- (для швидкого JOIN без cross-database запитів)
-- ============================================================================

CREATE TABLE IF NOT EXISTS node_cache (
    id SERIAL PRIMARY KEY,
    node_id TEXT NOT NULL UNIQUE,
    node_name TEXT NOT NULL,
    hostname TEXT,
    status TEXT DEFAULT 'offline',
    roles TEXT[] DEFAULT '{}',
    gpu JSONB DEFAULT NULL,
    environment TEXT DEFAULT 'production',
    last_sync TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_node_cache_node_id ON node_cache(node_id);
CREATE INDEX IF NOT EXISTS idx_node_cache_status ON node_cache(status);

COMMENT ON TABLE node_cache IS 'Кеш нод з Node Registry для швидкого JOIN з agents';

-- ============================================================================
-- Початкові дані для node_cache
-- ============================================================================

INSERT INTO node_cache (node_id, node_name, hostname, status, roles, environment)
VALUES 
    ('node-1-hetzner-gex44', 'Hetzner GEX44 Production', '144.76.224.179', 'online', 
     ARRAY['core', 'gateway', 'matrix', 'agents', 'gpu'], 'production'),
    ('node-2-macbook-m4max', 'MacBook Pro M4 Max', '192.168.1.33', 'online', 
     ARRAY['development', 'gpu', 'ai_runtime'], 'development')
ON CONFLICT (node_id) DO UPDATE SET
    node_name = EXCLUDED.node_name,
    hostname = EXCLUDED.hostname,
    status = EXCLUDED.status,
    roles = EXCLUDED.roles,
    environment = EXCLUDED.environment,
    updated_at = NOW();

-- ============================================================================
-- Тригер для оновлення updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_node_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_node_cache_updated_at ON node_cache;
CREATE TRIGGER trigger_update_node_cache_updated_at
    BEFORE UPDATE ON node_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_node_cache_updated_at();

-- ============================================================================
-- Перевірка результату
-- ============================================================================

SELECT 
    a.id,
    a.display_name,
    a.node_id,
    nc.node_name,
    nc.roles,
    nc.environment
FROM agents a
LEFT JOIN node_cache nc ON a.node_id = nc.node_id
WHERE a.is_public = true
LIMIT 10;

SELECT 'Migration 022 completed: Agent node_id normalized and node_cache created' AS result;

