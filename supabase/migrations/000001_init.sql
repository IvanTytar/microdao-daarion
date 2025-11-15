-- 000001_init.sql
-- Up

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "vector";

create table if not exists users (
  id text primary key,           -- u_...
  email text unique not null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists sessions (
  session_id text primary key,
  user_id text not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

-- Down
drop table if exists sessions cascade;
drop table if exists users cascade;
