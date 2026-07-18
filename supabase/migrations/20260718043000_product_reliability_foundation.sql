alter table users
  add column if not exists ui_preferences jsonb not null default '{
    "theme":"system",
    "density":"comfortable",
    "favoriteProjects":[],
    "pinnedResources":[],
    "dashboardWidgets":[],
    "recentEntities":[]
  }'::jsonb;

alter table users
  alter column notification_preferences set default '{
    "ticketAssignments":true,
    "mentionsAndComments":true,
    "sprintRiskAlerts":true,
    "weeklySummary":false,
    "slaAlerts":true
  }'::jsonb;

update users
set notification_preferences = coalesce(notification_preferences, '{}'::jsonb)
  || '{"slaAlerts":true}'::jsonb
where not coalesce(notification_preferences, '{}'::jsonb) ? 'slaAlerts';

alter table tickets
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by text references users(id) on delete set null,
  add column if not exists purge_after timestamptz;

create index if not exists tickets_active_org_project_idx
  on tickets (organization, project, updated_at desc)
  where deleted_at is null;
create index if not exists tickets_purge_after_idx
  on tickets (purge_after)
  where deleted_at is not null;

alter table outbox_events add column if not exists dedupe_key text;
create unique index if not exists outbox_events_dedupe_idx
  on outbox_events (organization, dedupe_key)
  where dedupe_key is not null;

create table if not exists outbox_deliveries (
  id text primary key default gen_random_uuid()::text,
  organization text not null references organizations(id) on delete cascade,
  event text not null references outbox_events(id) on delete cascade,
  channel text not null check (channel in ('email', 'webhook')),
  destination text not null,
  destination_ref text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'processed', 'failed')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  last_error_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event, channel, destination)
);
create index if not exists outbox_deliveries_pending_idx
  on outbox_deliveries (status, next_attempt_at, created_at);
alter table outbox_deliveries enable row level security;
create policy tenant_select on outbox_deliveries for select using (app_has_org_access(organization));
create policy tenant_insert on outbox_deliveries for insert with check (app_has_org_access(organization));
create policy tenant_update on outbox_deliveries for update using (app_has_org_access(organization)) with check (app_has_org_access(organization));
create policy tenant_delete on outbox_deliveries for delete using (app_has_org_access(organization));

create table if not exists ticket_comments (
  id text primary key default gen_random_uuid()::text,
  organization text not null references organizations(id) on delete cascade,
  ticket text not null references tickets(id) on delete cascade,
  author text references users(id) on delete set null,
  body text not null,
  legacy_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ticket, legacy_id)
);
create index if not exists ticket_comments_ticket_idx on ticket_comments (ticket, created_at);

create table if not exists ticket_work_logs (
  id text primary key default gen_random_uuid()::text,
  organization text not null references organizations(id) on delete cascade,
  ticket text not null references tickets(id) on delete cascade,
  author text references users(id) on delete set null,
  hours numeric(8,2) not null check (hours > 0),
  note text not null default '',
  legacy_id text,
  created_at timestamptz not null default now(),
  unique (ticket, legacy_id)
);
create index if not exists ticket_work_logs_ticket_idx on ticket_work_logs (ticket, created_at);

create table if not exists ticket_history (
  id text primary key default gen_random_uuid()::text,
  organization text not null references organizations(id) on delete cascade,
  ticket text not null references tickets(id) on delete cascade,
  actor text references users(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  legacy_id text,
  created_at timestamptz not null default now(),
  unique (ticket, legacy_id)
);
create index if not exists ticket_history_ticket_idx on ticket_history (ticket, created_at);

create table if not exists ticket_watchers (
  organization text not null references organizations(id) on delete cascade,
  ticket text not null references tickets(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (ticket, user_id)
);
create index if not exists ticket_watchers_user_idx on ticket_watchers (organization, user_id, ticket);

create table if not exists ticket_issue_links (
  id text primary key default gen_random_uuid()::text,
  organization text not null references organizations(id) on delete cascade,
  source_ticket text not null references tickets(id) on delete cascade,
  target_ticket text references tickets(id) on delete cascade,
  link_type text not null,
  target_key text,
  legacy_id text,
  created_at timestamptz not null default now(),
  unique (source_ticket, legacy_id)
);
create index if not exists ticket_issue_links_source_idx on ticket_issue_links (source_ticket, created_at);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'ticket_comments',
    'ticket_work_logs',
    'ticket_history',
    'ticket_watchers',
    'ticket_issue_links'
  ]
  loop
    execute format('alter table %I enable row level security', table_name);
    execute format('create policy tenant_select on %I for select using (app_has_org_access(organization))', table_name);
    execute format('create policy tenant_insert on %I for insert with check (app_has_org_access(organization))', table_name);
    execute format('create policy tenant_update on %I for update using (app_has_org_access(organization)) with check (app_has_org_access(organization))', table_name);
    execute format('create policy tenant_delete on %I for delete using (app_has_org_access(organization))', table_name);
  end loop;
end $$;

insert into ticket_comments (organization, ticket, author, body, legacy_id, created_at, updated_at)
select t.organization, t.id, nullif(item->>'authorId', ''), coalesce(item->>'body', item->>'text', ''), item->>'_id',
  coalesce((item->>'createdAt')::timestamptz, t.created_at), coalesce((item->>'updatedAt')::timestamptz, t.updated_at)
from tickets t cross join lateral jsonb_array_elements(coalesce(t.comments, '[]'::jsonb)) item
where coalesce(item->>'_id', '') <> ''
on conflict (ticket, legacy_id) do nothing;

insert into ticket_work_logs (organization, ticket, author, hours, note, legacy_id, created_at)
select t.organization, t.id, nullif(item->>'authorId', ''), greatest(coalesce((item->>'hours')::numeric, 0.25), 0.25),
  coalesce(item->>'note', ''), item->>'_id', coalesce((item->>'createdAt')::timestamptz, t.created_at)
from tickets t cross join lateral jsonb_array_elements(coalesce(t.work_logs, '[]'::jsonb)) item
where coalesce(item->>'_id', '') <> ''
on conflict (ticket, legacy_id) do nothing;
