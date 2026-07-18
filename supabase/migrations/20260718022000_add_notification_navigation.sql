alter table notifications
  add column if not exists href text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;
