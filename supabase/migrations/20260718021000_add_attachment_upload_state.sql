alter table ticket_attachments
  add column if not exists upload_status text not null default 'completed',
  add column if not exists uploaded_at timestamptz;

update ticket_attachments
set uploaded_at = coalesce(uploaded_at, created_at)
where upload_status = 'completed' and uploaded_at is null;

do $$ begin
  alter table ticket_attachments drop constraint if exists ticket_attachments_organization_fkey;
  alter table ticket_attachments
    add constraint ticket_attachments_organization_fkey
    foreign key (organization) references organizations(id) on delete cascade;
exception when duplicate_object then null;
end $$;

create index if not exists ticket_attachments_pending_idx
  on ticket_attachments (upload_status, created_at);
