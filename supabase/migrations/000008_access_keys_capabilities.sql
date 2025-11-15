-- 000008_access_keys_capabilities.sql
-- Up

create table if not exists access_keys (
  id text primary key,        -- ak_...
  subject_kind text not null
    check (subject_kind in ('user','agent','integration','embassy')),
  subject_id text not null,   -- u_/ag_/...
  team_id text references teams(id) on delete set null,
  name text not null,
  status text not null check (status in ('active','revoked','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  last_used_at timestamptz
);

create index if not exists idx_access_keys_subject
  on access_keys(subject_kind, subject_id);

create index if not exists idx_access_keys_team
  on access_keys(team_id);

create table if not exists capabilities (
  id text primary key,        -- cap_...
  code text not null unique,  -- chat.message.send, wallet.stake.ringk, ...
  description text not null
);

create table if not exists access_key_caps (
  key_id text not null references access_keys(id) on delete cascade,
  cap_id text not null references capabilities(id) on delete cascade,
  primary key (key_id, cap_id)
);

create index if not exists idx_access_key_caps_cap_id
  on access_key_caps(cap_id);

create table if not exists bundles (
  id text primary key,        -- bundle_...
  name text not null unique,  -- role.Member / plan.Premium / agent.default
  created_at timestamptz not null default now()
);

create table if not exists bundle_caps (
  bundle_id text not null references bundles(id) on delete cascade,
  cap_id text not null references capabilities(id) on delete cascade,
  primary key (bundle_id, cap_id)
);

create index if not exists idx_bundle_caps_cap_id
  on bundle_caps(cap_id);

-- Down
drop table if exists bundle_caps cascade;
drop table if exists bundles cascade;
drop table if exists access_key_caps cascade;
drop table if exists capabilities cascade;
drop table if exists access_keys cascade;
