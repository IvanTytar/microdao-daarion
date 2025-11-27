-- migrations/006_create_passkey_tables.sql
-- Passkey (WebAuthn) Authentication Schema

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Users Table (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- ============================================================================
-- Passkeys Table (WebAuthn Credentials)
-- ============================================================================

CREATE TABLE IF NOT EXISTS passkeys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  sign_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  device_name TEXT,
  transports TEXT[],  -- USB, NFC, BLE, internal
  aaguid TEXT,
  attestation_format TEXT
);

CREATE INDEX IF NOT EXISTS idx_passkeys_user_id ON passkeys(user_id);
CREATE INDEX IF NOT EXISTS idx_passkeys_credential_id ON passkeys(credential_id);
CREATE INDEX IF NOT EXISTS idx_passkeys_last_used ON passkeys(last_used_at DESC);

-- ============================================================================
-- Sessions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ,
  user_agent TEXT,
  ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================================
-- Passkey Challenges (temporary, for WebAuthn flow)
-- ============================================================================

CREATE TABLE IF NOT EXISTS passkey_challenges (
  challenge TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT,  -- For registration flow when user doesn't exist yet
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  challenge_type TEXT NOT NULL,  -- 'register' or 'authenticate'
  rp_id TEXT NOT NULL,
  origin TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_passkey_challenges_expires_at ON passkey_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_passkey_challenges_user_id ON passkey_challenges(user_id);

-- ============================================================================
-- User MicroDAO Memberships (for ActorIdentity)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_microdao_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  microdao_id TEXT NOT NULL,
  role TEXT NOT NULL,  -- 'owner', 'admin', 'member'
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  
  UNIQUE (user_id, microdao_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON user_microdao_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_microdao_id ON user_microdao_memberships(microdao_id);

-- ============================================================================
-- Cleanup Function (remove expired challenges and sessions)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_auth_data()
RETURNS void AS $$
BEGIN
  DELETE FROM passkey_challenges WHERE expires_at < now();
  DELETE FROM sessions WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Sample Data (for testing)
-- ============================================================================

-- Create test user
INSERT INTO users (id, email, username, display_name)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'admin@daarion.city', 'admin', 'Admin User'),
  ('00000000-0000-0000-0000-000000000093', 'user93@daarion.city', 'user93', 'User 93')
ON CONFLICT (email) DO NOTHING;

-- Add microDAO memberships
INSERT INTO user_microdao_memberships (user_id, microdao_id, role)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'microdao:daarion', 'owner'),
  ('00000000-0000-0000-0000-000000000093', 'microdao:7', 'owner'),
  ('00000000-0000-0000-0000-000000000093', 'microdao:daarion', 'member')
ON CONFLICT (user_id, microdao_id) DO NOTHING;

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();





