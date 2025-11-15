-- 000006_rwa.sql
-- Up

create table if not exists rwa_inventory (
  id text primary key,             -- rwa_...
  team_id text not null references teams(id) on delete cascade,
  type text not null check (type in ('energy','food','water','essence','generic')),
  quantity numeric(30, 8) not null check (quantity >= 0),
  unit text not null default 'unit',
  metadata jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_rwa_inventory_team_type
  on rwa_inventory(team_id, type);

-- Down
drop table if exists rwa_inventory cascade;
