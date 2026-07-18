create table if not exists schema_migrations (
  version text primary key,
  checksum text not null,
  applied_at timestamptz not null default now()
);

create or replace function app_current_user_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'user_id', ''),
    nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')
  )
$$;

create or replace function app_has_org_access(target_org text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from organization_memberships membership
    where membership.organization = target_org
      and membership.user_id = app_current_user_id()
      and membership.status = 'active'
  ) or exists (
    select 1 from organizations organization
    where organization.id = target_org
      and organization.owner = app_current_user_id()
  )
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organizations', 'organization_memberships', 'invitations', 'projects', 'sprints',
    'cycles', 'tickets', 'workspace_resources', 'sessions', 'action_tokens', 'notifications',
    'integrations', 'counters', 'audit_events', 'ticket_attachments'
  ] loop
    execute format('alter table %I enable row level security', table_name);
    execute format('drop policy if exists tenant_select on %I', table_name);
    execute format('drop policy if exists tenant_insert on %I', table_name);
    execute format('drop policy if exists tenant_update on %I', table_name);
    execute format('drop policy if exists tenant_delete on %I', table_name);
  end loop;
end $$;

create policy tenant_select on organizations for select using (app_has_org_access(id));
create policy tenant_insert on organizations for insert with check (owner = app_current_user_id());
create policy tenant_update on organizations for update using (app_has_org_access(id)) with check (app_has_org_access(id));
create policy tenant_delete on organizations for delete using (app_has_org_access(id));

create policy tenant_select on organization_memberships for select using (app_has_org_access(organization) or user_id = app_current_user_id());
create policy tenant_insert on organization_memberships for insert with check (app_has_org_access(organization));
create policy tenant_update on organization_memberships for update using (app_has_org_access(organization)) with check (app_has_org_access(organization));
create policy tenant_delete on organization_memberships for delete using (app_has_org_access(organization));

create policy tenant_select on users for select using (
  id = app_current_user_id()
  or exists (select 1 from organization_memberships membership where membership.user_id = users.id and app_has_org_access(membership.organization))
);
create policy tenant_update on users for update using (id = app_current_user_id()) with check (id = app_current_user_id());

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'invitations', 'projects', 'sprints', 'cycles', 'tickets', 'workspace_resources',
    'sessions', 'action_tokens', 'notifications', 'integrations', 'counters', 'audit_events', 'ticket_attachments'
  ] loop
    execute format('create policy tenant_select on %I for select using (app_has_org_access(organization))', table_name);
    execute format('create policy tenant_insert on %I for insert with check (app_has_org_access(organization))', table_name);
    execute format('create policy tenant_update on %I for update using (app_has_org_access(organization)) with check (app_has_org_access(organization))', table_name);
    execute format('create policy tenant_delete on %I for delete using (app_has_org_access(organization))', table_name);
  end loop;
end $$;
