create table if not exists ai_conversations (
  id text primary key default gen_random_uuid()::text,
  organization text not null references organizations(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_messages (
  id text primary key default gen_random_uuid()::text,
  conversation_id text not null references ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_conversations_owner_updated_idx
  on ai_conversations (organization, user_id, updated_at desc);
create index if not exists ai_messages_conversation_created_idx
  on ai_messages (conversation_id, created_at asc);
