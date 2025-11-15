-- 000007_embassy.sql
-- Up

create table if not exists embassy_identities (
  id text primary key,           -- emb_...
  external_id text not null,
  platform text not null check (
    platform in ('energy_union','greenfood','water_union','essence_stream','daarion_core','daarwizz')
  ),
  user_id text references users(id) on delete set null,
  team_id text references teams(id) on delete set null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_embassy_identities_platform_external
  on embassy_identities(platform, external_id);

create table if not exists embassy_webhooks (
  id text primary key,           -- hook_...
  platform text not null check (
    platform in ('energy_union','greenfood','water_union','essence_stream','daarion_core','daarwizz')
  ),
  url text not null,
  secret text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_embassy_webhooks_platform_active
  on embassy_webhooks(platform, is_active);

create table if not exists oracles (
  id text primary key,
  platform text not null check (
    platform in ('energy_union','greenfood','water_union','essence_stream')
  ),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_oracles_platform_created_at
  on oracles(platform, created_at);

-- Down
drop table if exists oracles cascade;
drop table if exists embassy_webhooks cascade;
drop table if exists embassy_identities cascade;
