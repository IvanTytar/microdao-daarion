-- MicroDAO core schema (DDL)
-- Requires: PostgreSQL 14+, extensions pgcrypto and pgvector
-- Safe to run multiple times (uses IF NOT EXISTS where possible)

-- 0) Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- 1) Enum types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_type') THEN
    CREATE TYPE org_type AS ENUM ('solo', 'dao');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'visibility') THEN
    CREATE TYPE visibility AS ENUM ('private', 'dao', 'public');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
    CREATE TYPE notification_status AS ENUM ('queued', 'sent', 'failed', 'read');
  END IF;
END $$;

-- 2) Helpers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

-- 3) Users and Orgs
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type org_type NOT NULL DEFAULT 'solo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_orgs_updated_at
BEFORE UPDATE ON orgs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- (optional) membership table for future use
CREATE TABLE IF NOT EXISTS org_members (
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (org_id, user_id)
);

-- 4) Channels and Messages
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  visibility visibility NOT NULL DEFAULT 'dao',
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_channels_org ON channels(org_id);
CREATE INDEX IF NOT EXISTS idx_channels_meta_gin ON channels USING GIN (meta);
CREATE TRIGGER trg_channels_updated_at
BEFORE UPDATE ON channels
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_channel_created ON messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_meta_gin ON messages USING GIN (meta);

-- 5) Documents and USDO entities
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,               -- e.g., 'upload', 'ipfs://cid', 'arxiv:XXXX'
  owner_type TEXT NOT NULL CHECK (owner_type IN ('user','org')),
  owner_id UUID NOT NULL,
  format TEXT NOT NULL,               -- 'pdf','html','image','md'
  meta JSONB NOT NULL DEFAULT '{}',   -- e.g., filename, hashes, policyId
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_documents_owner_user
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
    -- If owner_type='org', create a partial FK via trigger or accept soft constraint
);
-- Optional soft constraint: ensure owner exists in either table (implemented via trigger in app-layer).
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_meta_gin ON documents USING GIN (meta);
CREATE TRIGGER trg_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS usdo_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                 -- 'section','equation','table','figure','code','reference', etc.
  payload JSONB NOT NULL,             -- normalized USDO fragment
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_usdo_doc_kind ON usdo_entities(doc_id, kind);
CREATE INDEX IF NOT EXISTS idx_usdo_payload_gin ON usdo_entities USING GIN (payload);
CREATE INDEX IF NOT EXISTS idx_usdo_meta_gin ON usdo_entities USING GIN (meta);

-- 6) Chunks and RAG index
-- pgvector storage for text/image embeddings; adjust dimensions to your model
CREATE TABLE IF NOT EXISTS chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}',   -- offsets, section ref, citations, policy, etc.
  acl visibility NOT NULL DEFAULT 'dao',
  vec VECTOR(1536),                   -- set to your embedding dimension
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON chunks(doc_id);
CREATE INDEX IF NOT EXISTS idx_chunks_acl ON chunks(acl);
CREATE INDEX IF NOT EXISTS idx_chunks_meta_gin ON chunks USING GIN (meta);
-- IVF index for ANN search; tune lists per dataset size
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_chunks_vec_ivfflat'
  ) THEN
    CREATE INDEX idx_chunks_vec_ivfflat ON chunks USING ivfflat (vec vector_l2_ops) WITH (lists = 100);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS rag_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID NOT NULL UNIQUE REFERENCES chunks(id) ON DELETE CASCADE,
  space visibility NOT NULL,          -- private/dao/public space
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rag_space ON rag_index(space);
CREATE INDEX IF NOT EXISTS idx_rag_meta_gin ON rag_index USING GIN (meta);

-- 7) Agent events, Policies, Rewards, Notifications, Audit
CREATE TABLE IF NOT EXISTS agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL,
  type TEXT NOT NULL,                 -- e.g., 'run.started','run.completed','run.failed','policy.blocked'
  payload JSONB NOT NULL DEFAULT '{}',
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_events_run ON agent_events(run_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_agent_events_type ON agent_events(type);
CREATE INDEX IF NOT EXISTS idx_agent_events_payload_gin ON agent_events USING GIN (payload);

CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL,                -- e.g., 'org:{id}', 'channel:{id}', 'global'
  rules JSONB NOT NULL,               -- structured policy rules
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_policies_scope ON policies(scope);
CREATE INDEX IF NOT EXISTS idx_policies_rules_gin ON policies USING GIN (rules);
CREATE TRIGGER trg_policies_updated_at
BEFORE UPDATE ON policies
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,                 -- e.g., 'ingest','compute','contribution'
  amount NUMERIC(18,6) NOT NULL CHECK (amount >= 0),
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rewards_actor ON rewards(actor_id);
CREATE INDEX IF NOT EXISTS idx_rewards_kind ON rewards(kind);
CREATE INDEX IF NOT EXISTS idx_rewards_meta_gin ON rewards USING GIN (meta);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,                 -- e.g., 'ingest.completed','quota.exceeded'
  payload JSONB NOT NULL DEFAULT '{}',
  status notification_status NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_kind ON notifications(kind);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor UUID,                         -- user id or service principal
  action TEXT NOT NULL,               -- e.g., 'policy.update','channel.visibility.changed'
  target JSONB NOT NULL DEFAULT '{}', -- embeds ids, kinds
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip INET
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_logs(ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_target_gin ON audit_logs USING GIN (target);

-- 8) Basic RLS scaffolding (disabled by default)
-- Enable and tailor at the application stage. Left commented intentionally.
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE rag_index ENABLE ROW LEVEL SECURITY;

-- Example policy patterns (to customize):
-- CREATE POLICY org_member_can_read_channels ON channels
--   FOR SELECT USING (EXISTS (SELECT 1 FROM org_members m WHERE m.org_id = channels.org_id AND m.user_id = auth.uid()));
-- CREATE POLICY author_can_edit_message ON messages
--   FOR UPDATE USING (author_id = auth.uid());

-- 9) Comments for maintainability
COMMENT ON TABLE users IS 'End users of MicroDAO. Plan used for quotas.';
COMMENT ON TABLE orgs IS 'Organizations/DAOs.';
COMMENT ON TABLE channels IS 'Chat channels per org with visibility.';
COMMENT ON TABLE messages IS 'Messages in channels with JSONB meta for mentions, citations.';
COMMENT ON TABLE documents IS 'Ingested sources. USDO is derived from here.';
COMMENT ON TABLE usdo_entities IS 'USDO fragments: sections, equations, tables, figures, code, references.';
COMMENT ON TABLE chunks IS 'RAG chunks with embeddings and ACL.';
COMMENT ON COLUMN chunks.vec IS 'Embedding vector; dimension must match your model.';
COMMENT ON TABLE rag_index IS 'Space mapping for chunks (private/dao/public).';
COMMENT ON TABLE agent_events IS 'Operational events for agent runs.';
COMMENT ON TABLE policies IS 'Policy documents and metadata.';
COMMENT ON TABLE rewards IS 'Rewards issued to actors for contributions/compute.';
COMMENT ON TABLE notifications IS 'User notifications across channels.';
COMMENT ON TABLE audit_logs IS 'Immutable audit trail for compliance.';