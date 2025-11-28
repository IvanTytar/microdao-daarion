-- Migration 015: Add modules to Node Registry
-- Date: 2025-11-28
-- Description: Adds modules JSONB column for node profile standard v1

-- ============================================================================
-- 1. Add modules column to nodes table
-- ============================================================================
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS modules JSONB DEFAULT '[]';
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS gpu JSONB DEFAULT NULL;
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}';
ALTER TABLE nodes ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0.0';

-- ============================================================================
-- 2. Update NODE1 with full profile
-- ============================================================================
UPDATE nodes SET 
    roles = ARRAY['core', 'gateway', 'matrix', 'agents', 'gpu'],
    gpu = '{"name": "NVIDIA RTX 4000 SFF Ada Generation", "vram_gb": 20}'::jsonb,
    modules = '[
        {"id": "core.node", "status": "up"},
        {"id": "core.health", "status": "up"},
        {"id": "infra.postgres", "status": "up", "port": 5432},
        {"id": "infra.redis", "status": "up", "port": 6379},
        {"id": "infra.nats", "status": "up", "port": 4222},
        {"id": "infra.qdrant", "status": "up", "port": 6333},
        {"id": "infra.neo4j", "status": "up", "port": 7474},
        {"id": "ai.ollama", "status": "up", "port": 11434},
        {"id": "ai.swapper", "status": "degraded", "port": 8890},
        {"id": "ai.router", "status": "up", "port": 9102},
        {"id": "ai.stt", "status": "degraded", "port": 8895},
        {"id": "ai.tts", "status": "up", "port": 5002},
        {"id": "ai.ocr", "status": "degraded", "port": 8896},
        {"id": "ai.memory", "status": "up", "port": 8001},
        {"id": "ai.crewai", "status": "up", "port": 9010},
        {"id": "daarion.web", "status": "up", "port": 3000},
        {"id": "daarion.city", "status": "up", "port": 7001},
        {"id": "daarion.agents", "status": "up", "port": 7002},
        {"id": "daarion.auth", "status": "up", "port": 7020},
        {"id": "matrix.synapse", "status": "up", "port": 8018},
        {"id": "matrix.element", "status": "up", "port": 8088},
        {"id": "matrix.gateway", "status": "up", "port": 7025},
        {"id": "matrix.presence", "status": "up", "port": 8085},
        {"id": "dagi.gateway", "status": "up", "port": 9300},
        {"id": "dagi.rbac", "status": "up", "port": 9200},
        {"id": "dagi.registry", "status": "up", "port": 9205},
        {"id": "monitoring.prometheus", "status": "up", "port": 9090}
    ]'::jsonb
WHERE node_id = 'node-1-hetzner-gex44';

-- ============================================================================
-- 3. Update NODE2 with full profile
-- ============================================================================
UPDATE nodes SET 
    roles = ARRAY['development', 'gpu', 'ai_runtime'],
    gpu = '{"name": "Apple M4 Max", "unified_memory_gb": 128}'::jsonb,
    modules = '[
        {"id": "core.node", "status": "up"},
        {"id": "core.health", "status": "up"},
        {"id": "infra.postgres", "status": "up", "port": 5432},
        {"id": "infra.qdrant", "status": "up", "port": 6333},
        {"id": "ai.ollama", "status": "up", "port": 11434, "models": ["deepseek-r1:70b", "deepseek-coder:33b", "qwen2.5-coder:32b", "gemma2:27b", "mistral-nemo:12b", "llava:13b"]},
        {"id": "ai.swapper", "status": "up", "port": 8890},
        {"id": "ai.router", "status": "up", "port": 9102},
        {"id": "ai.stt", "status": "up", "port": 8895},
        {"id": "ai.ocr", "status": "up", "port": 8896},
        {"id": "dagi.gateway", "status": "up", "port": 9300},
        {"id": "dagi.rbac", "status": "up", "port": 9200},
        {"id": "dagi.crewai", "status": "up", "port": 9010},
        {"id": "integration.web_search", "status": "up", "port": 8897}
    ]'::jsonb
WHERE node_id = 'node-2-macbook-m4max';

-- Done!
SELECT 'Migration 015 completed: Node Registry modules added' as result;

