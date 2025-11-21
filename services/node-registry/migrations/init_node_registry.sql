-- Node Registry Database Initialization Script
-- For DAGI Stack Node Registry Service
-- Version: 0.1.0
-- Date: 2025-01-17

-- Create database (run as postgres superuser)
CREATE DATABASE node_registry;

-- Connect to database
\c node_registry;

-- Create user with secure password
-- NOTE: Replace 'CHANGE_ME_STRONG_PASSWORD' with actual strong password
CREATE USER node_registry_user WITH ENCRYPTED PASSWORD 'CHANGE_ME_STRONG_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE node_registry TO node_registry_user;
GRANT ALL ON SCHEMA public TO node_registry_user;
GRANT CREATE ON SCHEMA public TO node_registry_user;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create nodes table (basic schema - will be expanded by Cursor)
CREATE TABLE IF NOT EXISTS nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id VARCHAR(255) UNIQUE NOT NULL,
    node_name VARCHAR(255) NOT NULL,
    node_role VARCHAR(50) NOT NULL, -- 'production', 'development', 'backup'
    node_type VARCHAR(50) NOT NULL, -- 'router', 'gateway', 'worker', etc.
    ip_address INET,
    local_ip INET,
    hostname VARCHAR(255),
    status VARCHAR(50) DEFAULT 'offline', -- 'online', 'offline', 'maintenance'
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    CONSTRAINT valid_status CHECK (status IN ('online', 'offline', 'maintenance', 'degraded'))
);

-- Create node profiles table
CREATE TABLE IF NOT EXISTS node_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    profile_name VARCHAR(255) NOT NULL,
    profile_type VARCHAR(50) NOT NULL, -- 'llm', 'service', 'capability'
    config JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(node_id, profile_name)
);

-- Create heartbeat log table (for monitoring)
CREATE TABLE IF NOT EXISTS heartbeat_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id UUID REFERENCES nodes(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50),
    metrics JSONB DEFAULT '{}'
);

-- Create indexes
CREATE INDEX idx_nodes_status ON nodes(status);
CREATE INDEX idx_nodes_last_heartbeat ON nodes(last_heartbeat DESC);
CREATE INDEX idx_nodes_node_id ON nodes(node_id);
CREATE INDEX idx_node_profiles_node_id ON node_profiles(node_id);
CREATE INDEX idx_node_profiles_enabled ON node_profiles(enabled);
CREATE INDEX idx_heartbeat_log_node_id ON heartbeat_log(node_id);
CREATE INDEX idx_heartbeat_log_timestamp ON heartbeat_log(timestamp DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_nodes_updated_at
    BEFORE UPDATE ON nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_node_profiles_updated_at
    BEFORE UPDATE ON node_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant table permissions to user
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO node_registry_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO node_registry_user;

-- Insert initial nodes (Node #1 and Node #2)
INSERT INTO nodes (node_id, node_name, node_role, node_type, ip_address, local_ip, hostname, status)
VALUES 
    ('node-1-hetzner-gex44', 'Hetzner GEX44 Production', 'production', 'router', '144.76.224.179', NULL, 'gateway.daarion.city', 'offline'),
    ('node-2-macbook-m4max', 'MacBook Pro M4 Max', 'development', 'router', NULL, '192.168.1.244', 'MacBook-Pro.local', 'offline')
ON CONFLICT (node_id) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Node Registry database initialized successfully';
    RAISE NOTICE '📊 Tables created: nodes, node_profiles, heartbeat_log';
    RAISE NOTICE '👤 User created: node_registry_user';
    RAISE NOTICE '⚠️  IMPORTANT: Change default password in production!';
END $$;
