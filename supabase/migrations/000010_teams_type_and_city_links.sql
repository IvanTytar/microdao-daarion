-- 000010_teams_type_and_city_links.sql
-- Add type field to teams and city_links table for DAARION.city integration

-- Up

-- Add type field to teams table
alter table teams 
add column if not exists type text check (type in ('city', 'platform', 'community', 'guild', 'lab', 'personal'));

-- Add index for type
create index if not exists idx_teams_type on teams(type);

-- Add parent_team_id for hierarchical structure (DAARION.city -> platforms -> microDAO)
alter table teams
add column if not exists parent_team_id text references teams(id) on delete set null;

-- Add index for parent_team_id
create index if not exists idx_teams_parent_team_id on teams(parent_team_id);

-- Create city_links table for explicit relationships
create table if not exists city_links (
  id text primary key,
  parent_team_id text not null references teams(id) on delete cascade,
  child_team_id text not null references teams(id) on delete cascade,
  relation_type text not null check (relation_type in ('platform', 'microdao', 'subdao')),
  created_at timestamptz not null default now(),
  unique (parent_team_id, child_team_id)
);

create index if not exists idx_city_links_parent_team_id on city_links(parent_team_id);
create index if not exists idx_city_links_child_team_id on city_links(child_team_id);

-- Insert DAARION.city as first MicroDAO (type='city')
insert into teams (id, name, slug, mode, type, parent_team_id, created_at)
values (
  'daarion-city',
  'DAARION.city',
  'daarion',
  'public',
  'city',
  null,
  now()
)
on conflict (slug) do nothing;

-- Down
drop table if exists city_links cascade;
alter table teams drop column if exists parent_team_id;
alter table teams drop column if exists type;

