-- Complete database setup for worklog application
-- Run this script in Supabase SQL Editor

-- ==============================================
-- 1. ADMIN ROLES SETUP
-- ==============================================

-- Create admin_roles table
create table if not exists public.admin_roles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on admin_roles table
alter table public.admin_roles enable row level security;

-- Create RLS policies for admin_roles
drop policy if exists "Users can read own admin status" on public.admin_roles;
create policy "Users can read own admin status" on public.admin_roles
for select to authenticated
using (id = auth.uid());

drop policy if exists "Service role can manage admin roles" on public.admin_roles;
create policy "Service role can manage admin roles" on public.admin_roles
for all to service_role
using (true)
with check (true);

-- Create function to check if user is admin
create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean as $$
begin
  return exists (
    select 1 from public.admin_roles 
    where id = user_id and is_admin = true
  );
end;
$$ language plpgsql security definer;

-- Grant execute permission on the function
grant execute on function public.is_admin(uuid) to authenticated;

-- Create trigger to automatically create admin_roles entry for new users
create or replace function public.handle_new_user_admin()
returns trigger as $$
begin
  insert into public.admin_roles (id, is_admin)
  values (new.id, false)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_admin on auth.users;
create trigger on_auth_user_created_admin
after insert on auth.users
for each row execute procedure public.handle_new_user_admin();

-- ==============================================
-- 2. WORKLOGS SETUP
-- ==============================================

-- Create worklogs table
create table if not exists public.worklogs (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  start_time time not null,
  end_time time not null,
  category text,
  file_url text,
  file_name text,
  processed_for_rag boolean default null,
  timestamp timestamptz default now()
);

-- Enable RLS on worklogs table
alter table public.worklogs enable row level security;

-- Create RLS policies for worklogs
drop policy if exists "Users can read own worklogs" on public.worklogs;
create policy "Users can read own worklogs" on public.worklogs
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own worklogs" on public.worklogs;
create policy "Users can insert own worklogs" on public.worklogs
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update own worklogs" on public.worklogs;
create policy "Users can update own worklogs" on public.worklogs
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own worklogs" on public.worklogs;
create policy "Users can delete own worklogs" on public.worklogs
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins can read all worklogs" on public.worklogs;
create policy "Admins can read all worklogs" on public.worklogs
for select to authenticated
using (
  exists (
    select 1 from public.admin_roles 
    where id = auth.uid() and is_admin = true
  )
);

-- Create indexes for worklogs
create index if not exists idx_worklogs_user_id on public.worklogs(user_id);
create index if not exists idx_worklogs_timestamp on public.worklogs(timestamp desc);
create index if not exists idx_worklogs_category on public.worklogs(category);
create index if not exists idx_worklogs_file_url on public.worklogs(file_url) where file_url is not null;
create index if not exists idx_worklogs_processed on public.worklogs(processed_for_rag) where processed_for_rag is not null;

-- ==============================================
-- 3. CHAT SETUP
-- ==============================================

-- Create chat_conversations table
create table if not exists public.chat_conversations (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz default now()
);

-- Create chat_messages table
create table if not exists public.chat_messages (
  id bigserial primary key,
  conversation_id bigint not null references public.chat_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- Enable RLS on chat tables
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

-- Create RLS policies for chat_conversations
drop policy if exists "Users can read own conversations" on public.chat_conversations;
create policy "Users can read own conversations" on public.chat_conversations
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own conversations" on public.chat_conversations;
create policy "Users can insert own conversations" on public.chat_conversations
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update own conversations" on public.chat_conversations;
create policy "Users can update own conversations" on public.chat_conversations
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own conversations" on public.chat_conversations;
create policy "Users can delete own conversations" on public.chat_conversations
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins can read all conversations" on public.chat_conversations;
create policy "Admins can read all conversations" on public.chat_conversations
for select to authenticated
using (
  exists (
    select 1 from public.admin_roles 
    where id = auth.uid() and is_admin = true
  )
);

-- Create RLS policies for chat_messages
drop policy if exists "Users can read own messages" on public.chat_messages;
create policy "Users can read own messages" on public.chat_messages
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own messages" on public.chat_messages;
create policy "Users can insert own messages" on public.chat_messages
for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update own messages" on public.chat_messages;
create policy "Users can update own messages" on public.chat_messages
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own messages" on public.chat_messages;
create policy "Users can delete own messages" on public.chat_messages
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins can read all messages" on public.chat_messages;
create policy "Admins can read all messages" on public.chat_messages
for select to authenticated
using (
  exists (
    select 1 from public.admin_roles 
    where id = auth.uid() and is_admin = true
  )
);

-- Create indexes for chat tables
create index if not exists idx_chat_conversations_user_id on public.chat_conversations(user_id);
create index if not exists idx_chat_conversations_created_at on public.chat_conversations(created_at desc);

create index if not exists idx_chat_messages_conversation_id on public.chat_messages(conversation_id);
create index if not exists idx_chat_messages_user_id on public.chat_messages(user_id);
create index if not exists idx_chat_messages_created_at on public.chat_messages(created_at);

-- ==============================================
-- 4. STORAGE SETUP
-- ==============================================

-- Create storage bucket for attachments
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- Create storage policies for attachments
drop policy if exists "Users can upload own files" on storage.objects;
create policy "Users can upload own files" on storage.objects
for insert to authenticated
with check (bucket_id = 'attachments' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can read own files" on storage.objects;
create policy "Users can read own files" on storage.objects
for select to authenticated
using (bucket_id = 'attachments' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete own files" on storage.objects;
create policy "Users can delete own files" on storage.objects
for delete to authenticated
using (bucket_id = 'attachments' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Admins can read all files" on storage.objects;
create policy "Admins can read all files" on storage.objects
for select to authenticated
using (
  bucket_id = 'attachments' and
  exists (
    select 1 from public.admin_roles 
    where id = auth.uid() and is_admin = true
  )
);

-- ==============================================
-- 5. VIEW SETUP
-- ==============================================

-- Create view that combines auth_users_extended with admin status
create or replace view public.user_profiles_with_admin as
select 
  aue.*,
  ar.is_admin,
  ar.created_at as admin_role_created_at,
  ar.updated_at as admin_role_updated_at
from public.auth_users_extended aue
left join public.admin_roles ar on aue.id = ar.id;

-- ==============================================
-- 6. SETUP COMPLETE
-- ==============================================

-- IMPORTANT: After running this script, set the first admin:
-- Replace 'your-admin-email@example.com' with the actual admin email
/*
insert into public.admin_roles (id, is_admin)
values (
  (select id from auth.users where email = 'your-admin-email@example.com'), 
  true
)
on conflict (id) do update set is_admin = true;
*/


