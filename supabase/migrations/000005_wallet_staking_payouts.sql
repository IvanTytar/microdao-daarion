-- 000005_wallet_staking_payouts.sql
-- Up

create table if not exists wallets (
  user_id text primary key references users(id) on delete cascade,
  address text unique,
  created_at timestamptz not null default now(),
  metadata jsonb default '{}'::jsonb
);

create table if not exists staking_ringk (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  amount numeric(30, 8) not null check (amount > 0),
  lock_until timestamptz,
  status text not null default 'locked' check (status in ('locked','unlocked')),
  created_at timestamptz not null default now()
);

create index if not exists idx_staking_ringk_user_id
  on staking_ringk(user_id);

create table if not exists payouts (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  amount numeric(30, 8) not null check (amount > 0),
  symbol text not null,                -- KWT, 1T, DAAR…
  status text not null default 'pending'
    check (status in ('pending','claimed','cancelled')),
  created_at timestamptz not null default now(),
  claimed_at timestamptz
);

create index if not exists idx_payouts_user_id_status
  on payouts(user_id, status);

-- Down
drop table if exists payouts cascade;
drop table if exists staking_ringk cascade;
drop table if exists wallets cascade;
