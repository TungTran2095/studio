-- Chat tables setup for worklog application
-- Run this script in Supabase SQL Editor

-- 1) Create chat_conversations table
create table if not exists public.chat_conversations (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz default now()
);

-- 2) Create chat_messages table
create table if not exists public.chat_messages (
  id bigserial primary key,
  conversation_id bigint not null references public.chat_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- 3) Enable RLS on chat tables
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

-- 4) Create RLS policies for chat_conversations
-- Allow users to read their own conversations
drop policy if exists "Users can read own conversations" on public.chat_conversations;
create policy "Users can read own conversations" on public.chat_conversations
for select to authenticated
using (user_id = auth.uid());

-- Allow users to insert their own conversations
drop policy if exists "Users can insert own conversations" on public.chat_conversations;
create policy "Users can insert own conversations" on public.chat_conversations
for insert to authenticated
with check (user_id = auth.uid());

-- Allow users to update their own conversations
drop policy if exists "Users can update own conversations" on public.chat_conversations;
create policy "Users can update own conversations" on public.chat_conversations
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Allow users to delete their own conversations
drop policy if exists "Users can delete own conversations" on public.chat_conversations;
create policy "Users can delete own conversations" on public.chat_conversations
for delete to authenticated
using (user_id = auth.uid());

-- Allow admins to read all conversations
drop policy if exists "Admins can read all conversations" on public.chat_conversations;
create policy "Admins can read all conversations" on public.chat_conversations
for select to authenticated
using (
  exists (
    select 1 from public.admin_roles 
    where id = auth.uid() and is_admin = true
  )
);

-- 5) Create RLS policies for chat_messages
-- Allow users to read messages from their own conversations
drop policy if exists "Users can read own messages" on public.chat_messages;
create policy "Users can read own messages" on public.chat_messages
for select to authenticated
using (user_id = auth.uid());

-- Allow users to insert messages to their own conversations
drop policy if exists "Users can insert own messages" on public.chat_messages;
create policy "Users can insert own messages" on public.chat_messages
for insert to authenticated
with check (user_id = auth.uid());

-- Allow users to update their own messages
drop policy if exists "Users can update own messages" on public.chat_messages;
create policy "Users can update own messages" on public.chat_messages
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Allow users to delete their own messages
drop policy if exists "Users can delete own messages" on public.chat_messages;
create policy "Users can delete own messages" on public.chat_messages
for delete to authenticated
using (user_id = auth.uid());

-- Allow admins to read all messages
drop policy if exists "Admins can read all messages" on public.chat_messages;
create policy "Admins can read all messages" on public.chat_messages
for select to authenticated
using (
  exists (
    select 1 from public.admin_roles 
    where id = auth.uid() and is_admin = true
  )
);

-- 6) Create indexes for better performance
create index if not exists idx_chat_conversations_user_id on public.chat_conversations(user_id);
create index if not exists idx_chat_conversations_created_at on public.chat_conversations(created_at desc);

create index if not exists idx_chat_messages_conversation_id on public.chat_messages(conversation_id);
create index if not exists idx_chat_messages_user_id on public.chat_messages(user_id);
create index if not exists idx_chat_messages_created_at on public.chat_messages(created_at);



