-- 000009_audit_outbox.sql
-- Up

create table if not exists audit_log (
  id text primary key,
  user_id text references users(id) on delete set null,
  team_id text references teams(id) on delete set null,
  action text not null,
  resource_kind text,
  resource_id text,
  data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_team_created_at
  on audit_log(team_id, created_at);

create table if not exists outbox_events (
  id text primary key,          -- evt_...
  topic text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  processed boolean not null default false,
  processed_at timestamptz
);

create index if not exists idx_outbox_events_processed
  on outbox_events(processed, created_at);

-- Down
drop table if exists outbox_events cascade;
drop table if exists audit_log cascade;
