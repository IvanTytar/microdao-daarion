-- 000002_microdao_core.sql
-- Up

create table if not exists teams (
  id text primary key,          -- t_...
  name text not null,
  slug text unique not null,
  mode text not null check (mode in ('public','confidential')),
  created_at timestamptz not null default now()
);

create table if not exists team_members (
  team_id text not null references teams(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  role text not null check (role in ('Owner','Guardian','Member')),
  viewer_type text not null check (viewer_type in ('reader','commenter','contributor')),
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index if not exists idx_team_members_user_id
  on team_members(user_id);

create table if not exists channels (
  id text primary key,            -- c_...
  team_id text not null references teams(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_channels_team_id
  on channels(team_id);

create table if not exists messages (
  id text primary key,           -- m_...
  channel_id text not null references channels(id) on delete cascade,
  user_id text references users(id) on delete set null,
  body text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_channel_id_created_at
  on messages(channel_id, created_at);

create table if not exists followups (
  id text primary key,           -- f_...
  message_id text not null references messages(id) on delete cascade,
  type text,                     -- agent/tool/summary/...
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_followups_message_id
  on followups(message_id);

create table if not exists comemory_items (
  id text primary key,
  team_id text not null references teams(id) on delete cascade,
  embeddings vector(1536),
  summary text,
  source_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_comemory_items_team_id
  on comemory_items(team_id);

-- Down
drop table if exists comemory_items cascade;
drop table if exists followups cascade;
drop table if exists messages cascade;
drop table if exists channels cascade;
drop table if exists team_members cascade;
drop table if exists teams cascade;
