create table if not exists companies (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  slug text not null unique,
  owner text references users(id),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table organizations add column if not exists company text references companies(id);

insert into companies (id, name, slug, owner, settings, created_at, updated_at)
select id, name, slug, owner, '{}'::jsonb, created_at, updated_at
from organizations
where company is null
on conflict (id) do nothing;

update organizations set company = id where company is null;
alter table organizations alter column company set not null;

create table if not exists company_memberships (
  id text primary key default gen_random_uuid()::text,
  company text not null references companies(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  role text not null default 'member',
  status text not null default 'active',
  department text,
  job_function text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company, user_id)
);

insert into company_memberships (company, user_id, role, status, job_function)
select o.company, om.user_id,
  case when om.role = 'admin' then 'admin' else 'member' end,
  om.status,
  case when om.role in ('engineer', 'designer') then om.role else null end
from organization_memberships om
join organizations o on o.id = om.organization
on conflict (company, user_id) do nothing;

create table if not exists company_groups (
  id text primary key default gen_random_uuid()::text,
  company text not null references companies(id) on delete cascade,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company, name)
);

create table if not exists company_group_members (
  id text primary key default gen_random_uuid()::text,
  group_id text not null references company_groups(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists workspace_group_access (
  id text primary key default gen_random_uuid()::text,
  workspace text not null references organizations(id) on delete cascade,
  group_id text not null references company_groups(id) on delete cascade,
  role text not null default 'engineer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace, group_id)
);

create index if not exists organizations_company_idx on organizations (company);
create index if not exists company_memberships_user_idx on company_memberships (user_id, status);
create index if not exists company_groups_company_idx on company_groups (company);
create index if not exists company_group_members_user_idx on company_group_members (user_id);
create index if not exists workspace_group_access_group_idx on workspace_group_access (group_id);

alter table companies enable row level security;
alter table company_memberships enable row level security;
alter table company_groups enable row level security;
alter table company_group_members enable row level security;
alter table workspace_group_access enable row level security;
