create table if not exists workspace_roles (
  id text primary key default gen_random_uuid()::text,
  organization text not null references organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  description text not null default '',
  permissions jsonb not null default '[]'::jsonb,
  is_system boolean not null default false,
  rank numeric not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization, slug),
  unique (organization, name)
);

create index if not exists workspace_roles_org_rank_idx on workspace_roles (organization, rank desc, name);
alter table workspace_roles enable row level security;
