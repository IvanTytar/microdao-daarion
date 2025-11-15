-- 000003_projects_tasks.sql
-- Up

create table if not exists projects (
  id text primary key,              -- p_...
  team_id text not null references teams(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_projects_team_id
  on projects(team_id);

create table if not exists tasks (
  id text primary key,              -- task_...
  project_id text not null references projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo'
    check (status in ('todo','in_progress','done','cancelled')),
  assignee text references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_tasks_project_id
  on tasks(project_id);

create index if not exists idx_tasks_assignee
  on tasks(assignee);

-- Down
drop table if exists tasks cascade;
drop table if exists projects cascade;
