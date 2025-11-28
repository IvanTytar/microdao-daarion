-- 1. MicroDAOs Table
CREATE TABLE IF NOT EXISTS microdaos (
    id             text PRIMARY KEY,
    slug           text UNIQUE NOT NULL,
    name           text NOT NULL,
    description    text,
    logo_url       text,
    owner_agent_id text, -- References agents(id) deferred
    created_at     timestamptz DEFAULT now(),
    updated_at     timestamptz DEFAULT now()
);

-- 2. Agent Matrix Config
CREATE TABLE IF NOT EXISTS agent_matrix_config (
    agent_id       text PRIMARY KEY REFERENCES agents(id) ON DELETE CASCADE,
    matrix_user_id text,
    matrix_access_token text,
    primary_room_id text,
    is_enabled     boolean DEFAULT true,
    updated_at     timestamptz DEFAULT now()
);

-- 3. MicroDAO Members
CREATE TABLE IF NOT EXISTS microdao_members (
    microdao_id    text REFERENCES microdaos(id) ON DELETE CASCADE,
    agent_id       text REFERENCES agents(id) ON DELETE CASCADE,
    role           text DEFAULT 'member',
    joined_at      timestamptz DEFAULT now(),
    PRIMARY KEY (microdao_id, agent_id)
);

-- 4. Insert Orchestrator Agents (Upsert)
INSERT INTO agents (id, display_name, kind, node_id, status, is_active, is_public) VALUES
('daarwizz',  'DAARWIZZ',      'orchestrator', 'NODE1', 'online', true, true),
('helion',    'Helion',        'orchestrator', 'NODE1', 'online', true, true),
('greenfood', 'GreenFood Bot', 'orchestrator', 'NODE1', 'online', true, true),
('druid',     'Druid',         'orchestrator', 'NODE1', 'online', true, true),
('clan',      'Clan Bot',      'orchestrator', 'NODE1', 'online', true, true),
('eonarch',   'Eonarch',       'orchestrator', 'NODE1', 'online', true, true),
('nutra',     'Nutra Bot',     'orchestrator', 'NODE1', 'online', true, true),
('soul',      'Soul Bot',      'orchestrator', 'NODE1', 'online', true, true),
('yaromir',   'Yaromir',       'orchestrator', 'NODE1', 'online', true, true)
ON CONFLICT (id) DO UPDATE SET 
    node_id = EXCLUDED.node_id,
    kind = EXCLUDED.kind,
    is_public = EXCLUDED.is_public;

-- 5. Insert MicroDAOs
INSERT INTO microdaos (id, name, slug, owner_agent_id, description, logo_url) VALUES
('dao_daarion',   'DAARION DAO',    'daarion',    'daarwizz',  'Main ecosystem DAO', '/assets/logos/daarion.png'),
('dao_energy',    'Energy Union',   'energy-union', 'helion',    'Energy optimization & sustainability', '/assets/logos/helion.png'),
('dao_greenfood', 'GreenFood DAO',  'greenfood',  'greenfood', 'Sustainable food systems', '/assets/logos/greenfood.png'),
('dao_druid',     'Druid Circle',   'druid',      'druid',     'Nature & wisdom preservation', '/assets/logos/druid.png'),
('dao_clan',      'Clan Network',   'clan',       'clan',      'Community & social bonding', '/assets/logos/clan.png'),
('dao_eonarch',   'Eonarch DAO',    'eonarch',    'eonarch',   'Long-term architectural planning', '/assets/logos/eonarch.png'),
('dao_nutra',     'Nutra Health',   'nutra',      'nutra',     'Health & nutrition monitoring', '/assets/logos/nutra.png'),
('dao_soul',      'Soul Protocol',  'soul',       'soul',      'Identity & reputation systems', '/assets/logos/soul.png'),
('dao_yaromir',   'Yaromir Tribe',  'yaromir',    'yaromir',   'Cultural heritage & storytelling', '/assets/logos/yaromir.png')
ON CONFLICT (id) DO UPDATE SET
    owner_agent_id = EXCLUDED.owner_agent_id;

-- 6. Insert Matrix Configs (Placeholders)
INSERT INTO agent_matrix_config (agent_id, matrix_user_id) VALUES
('daarwizz',  '@daarwizz:daarion.city'),
('helion',    '@helion:daarion.city'),
('greenfood', '@greenfood:daarion.city'),
('druid',     '@druid:daarion.city'),
('clan',      '@clan:daarion.city'),
('eonarch',   '@eonarch:daarion.city'),
('nutra',     '@nutra:daarion.city'),
('soul',      '@soul:daarion.city'),
('yaromir',   '@yaromir:daarion.city')
ON CONFLICT (agent_id) DO NOTHING;

-- 7. Link Owners to DAOs
INSERT INTO microdao_members (microdao_id, agent_id, role) VALUES
('dao_daarion', 'daarwizz', 'owner'),
('dao_energy', 'helion', 'owner'),
('dao_greenfood', 'greenfood', 'owner'),
('dao_druid', 'druid', 'owner'),
('dao_clan', 'clan', 'owner'),
('dao_eonarch', 'eonarch', 'owner'),
('dao_nutra', 'nutra', 'owner'),
('dao_soul', 'soul', 'owner'),
('dao_yaromir', 'yaromir', 'owner')
ON CONFLICT DO NOTHING;

