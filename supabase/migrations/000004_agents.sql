-- 000004_agents.sql
-- Up

create table if not exists agents (
  id text primary key,            -- ag_...
  team_id text not null references teams(id) on delete cascade,
  name text not null,
  description text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_agents_team_id
  on agents(team_id);

create table if not exists agent_runs (
  id text primary key,            -- run_...
  agent_id text not null references agents(id) on delete cascade,
  user_id text references users(id) on delete set null,
  input jsonb not null,
  output jsonb,
  status text not null default 'pending'
    check (status in ('pending','running','completed','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_agent_runs_agent_id_created_at
  on agent_runs(agent_id, created_at);

-- Down
drop table if exists agent_runs cascade;
drop table if exists agents cascade;
