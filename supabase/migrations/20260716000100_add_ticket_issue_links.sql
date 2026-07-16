alter table tickets
  add column if not exists issue_links jsonb not null default '[]'::jsonb;
