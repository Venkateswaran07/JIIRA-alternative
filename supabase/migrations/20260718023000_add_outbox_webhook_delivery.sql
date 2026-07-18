alter table integrations
  add column if not exists created_by text references users(id),
  add column if not exists secret_ciphertext text,
  add column if not exists failure_count integer not null default 0,
  add column if not exists last_error text,
  add column if not exists last_delivery_at timestamptz;

create table if not exists outbox_events (
  id text primary key default gen_random_uuid()::text,
  organization text not null references organizations(id) on delete cascade,
  event_type text not null,
  aggregate_type text,
  aggregate_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outbox_events_pending_idx
  on outbox_events (status, next_attempt_at, created_at);
create index if not exists integrations_webhook_active_idx
  on integrations (organization, kind, active);
alter table outbox_events enable row level security;
create policy tenant_select on outbox_events for select using (app_has_org_access(organization));
create policy tenant_insert on outbox_events for insert with check (app_has_org_access(organization));
create policy tenant_update on outbox_events for update using (app_has_org_access(organization)) with check (app_has_org_access(organization));
create policy tenant_delete on outbox_events for delete using (app_has_org_access(organization));
