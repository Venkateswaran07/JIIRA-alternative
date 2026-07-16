-- Create assist_ledger table
create table if not exists assist_ledger (
  id text primary key default gen_random_uuid()::text,
  organization text not null references organizations(id),
  ticket_id text not null,
  ticket_key text not null,
  title text not null,
  original_assignee text references users(id),
  completed_by text not null references users(id),
  story_points numeric not null default 0,
  credits numeric not null default 0,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Add assist-related columns to tickets
alter table tickets add column if not exists is_assisted boolean not null default false;
alter table tickets add column if not exists assist_risk_detected boolean not null default false;
alter table tickets add column if not exists assist_risk_probability numeric not null default 0;
alter table tickets add column if not exists assist_original_assignee text references users(id);
alter table tickets add column if not exists assist_credits numeric not null default 0;
alter table tickets add column if not exists assist_suggested_assignees jsonb not null default '[]'::jsonb;
