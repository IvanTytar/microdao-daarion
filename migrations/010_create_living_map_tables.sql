-- ============================================================================
-- Migration 010: Living Map Tables
-- Phase 9: Living Map (Full Stack Service)
-- ============================================================================

-- ============================================================================
-- Table: living_map_history
-- Purpose: Event log for all Living Map events
-- ============================================================================

CREATE TABLE IF NOT EXISTS living_map_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    source_service TEXT,
    entity_id TEXT,
    entity_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_living_map_history_timestamp
    ON living_map_history (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_living_map_history_event_type
    ON living_map_history (event_type);

CREATE INDEX IF NOT EXISTS idx_living_map_history_entity_id
    ON living_map_history (entity_id);

CREATE INDEX IF NOT EXISTS idx_living_map_history_entity_type
    ON living_map_history (entity_type);

CREATE INDEX IF NOT EXISTS idx_living_map_history_source_service
    ON living_map_history (source_service);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_living_map_history_type_timestamp
    ON living_map_history (event_type, timestamp DESC);

COMMENT ON TABLE living_map_history IS 'Event log for Living Map - tracks all network state changes';
COMMENT ON COLUMN living_map_history.event_type IS 'Type of event (e.g., node.metrics.update, agent.status.change)';
COMMENT ON COLUMN living_map_history.payload IS 'Full event data in JSON format';
COMMENT ON COLUMN living_map_history.source_service IS 'Service that generated the event';
COMMENT ON COLUMN living_map_history.entity_id IS 'ID of the entity (for filtering)';
COMMENT ON COLUMN living_map_history.entity_type IS 'Type: city|space|node|agent|dao|microdao';

-- ============================================================================
-- Table: living_map_snapshots (optional, for caching)
-- Purpose: Store periodic full snapshots for fast recovery
-- ============================================================================

CREATE TABLE IF NOT EXISTS living_map_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    snapshot_data JSONB NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0',
    compressed BOOLEAN DEFAULT FALSE,
    size_bytes INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_living_map_snapshots_generated_at
    ON living_map_snapshots (generated_at DESC);

COMMENT ON TABLE living_map_snapshots IS 'Periodic full state snapshots for fast recovery';
COMMENT ON COLUMN living_map_snapshots.snapshot_data IS 'Complete Living Map state in JSON';

-- ============================================================================
-- Function: Clean old history (retention policy)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_living_map_history()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete events older than 30 days
    DELETE FROM living_map_history
    WHERE timestamp < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete old snapshots (keep last 100)
    DELETE FROM living_map_snapshots
    WHERE id NOT IN (
        SELECT id FROM living_map_snapshots
        ORDER BY generated_at DESC
        LIMIT 100
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_living_map_history IS 'Cleanup old history and snapshots';

-- ============================================================================
-- Grants
-- ============================================================================

GRANT SELECT, INSERT, DELETE ON living_map_history TO postgres;
GRANT SELECT, INSERT, DELETE ON living_map_snapshots TO postgres;

-- ============================================================================
-- Seed Data: Initial event
-- ============================================================================

INSERT INTO living_map_history (event_type, payload, source_service, entity_type)
VALUES (
    'living_map.initialized',
    '{"message": "Living Map service initialized", "version": "1.0"}'::jsonb,
    'living-map-service',
    'system'
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'living_map_history'
    ) THEN
        RAISE NOTICE 'Migration 010: Living Map Tables created successfully';
    ELSE
        RAISE EXCEPTION 'Migration 010: Failed to create tables';
    END IF;
END $$;

