-- WorkLogs table setup for worklog application
-- Run this script in Supabase SQL Editor

-- 1) Create worklogs table
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

-- 2) Enable RLS on worklogs table
alter table public.worklogs enable row level security;

-- 3) Create RLS policies for worklogs
-- Allow users to read their own worklogs
drop policy if exists "Users can read own worklogs" on public.worklogs;
create policy "Users can read own worklogs" on public.worklogs
for select to authenticated
using (user_id = auth.uid());

-- Allow users to insert their own worklogs
drop policy if exists "Users can insert own worklogs" on public.worklogs;
create policy "Users can insert own worklogs" on public.worklogs
for insert to authenticated
with check (user_id = auth.uid());

-- Allow users to update their own worklogs
drop policy if exists "Users can update own worklogs" on public.worklogs;
create policy "Users can update own worklogs" on public.worklogs
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Allow users to delete their own worklogs
drop policy if exists "Users can delete own worklogs" on public.worklogs;
create policy "Users can delete own worklogs" on public.worklogs
for delete to authenticated
using (user_id = auth.uid());

-- Allow admins to read all worklogs (if admin_roles table exists)
drop policy if exists "Admins can read all worklogs" on public.worklogs;
create policy "Admins can read all worklogs" on public.worklogs
for select to authenticated
using (
  exists (
    select 1 from public.admin_roles 
    where id = auth.uid() and is_admin = true
  )
);

-- 4) Create indexes for better performance
create index if not exists idx_worklogs_user_id on public.worklogs(user_id);
create index if not exists idx_worklogs_timestamp on public.worklogs(timestamp desc);
create index if not exists idx_worklogs_category on public.worklogs(category);
create index if not exists idx_worklogs_file_url on public.worklogs(file_url) where file_url is not null;
create index if not exists idx_worklogs_processed on public.worklogs(processed_for_rag) where processed_for_rag is not null;

-- 5) Create storage bucket for attachments (if not exists)
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- 6) Create storage policies for attachments
-- Allow users to upload their own files
drop policy if exists "Users can upload own files" on storage.objects;
create policy "Users can upload own files" on storage.objects
for insert to authenticated
with check (bucket_id = 'attachments' and auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to read their own files
drop policy if exists "Users can read own files" on storage.objects;
create policy "Users can read own files" on storage.objects
for select to authenticated
using (bucket_id = 'attachments' and auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own files
drop policy if exists "Users can delete own files" on storage.objects;
create policy "Users can delete own files" on storage.objects
for delete to authenticated
using (bucket_id = 'attachments' and auth.uid()::text = (storage.foldername(name))[1]);

-- Allow admins to read all files
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



