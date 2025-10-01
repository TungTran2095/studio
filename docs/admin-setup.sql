-- Admin system setup for worklog application
-- Run this script in Supabase SQL Editor

-- 1) Add is_admin column to profiles table
alter table public.profiles 
add column if not exists is_admin boolean default false;

-- 2) Update RLS policies to allow admins to read all profiles
drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles" on public.profiles
for select to authenticated
using (
  exists (
    select 1 from public.profiles 
    where id = auth.uid() and is_admin = true
  )
);

-- 3) Allow admins to read all worklogs
drop policy if exists "Admins can read all worklogs" on public.worklogs;
create policy "Admins can read all worklogs" on public.worklogs
for select to authenticated
using (
  exists (
    select 1 from public.profiles 
    where id = auth.uid() and is_admin = true
  )
);

-- 4) Allow admins to read all chat conversations
drop policy if exists "Admins can read all conversations" on public.chat_conversations;
create policy "Admins can read all conversations" on public.chat_conversations
for select to authenticated
using (
  exists (
    select 1 from public.profiles 
    where id = auth.uid() and is_admin = true
  )
);

-- 5) Allow admins to read all chat messages
drop policy if exists "Admins can read all messages" on public.chat_messages;
create policy "Admins can read all messages" on public.chat_messages
for select to authenticated
using (
  exists (
    select 1 from public.profiles 
    where id = auth.uid() and is_admin = true
  )
);

-- 6) Create function to check if user is admin
create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles 
    where id = user_id and is_admin = true
  );
end;
$$ language plpgsql security definer;

-- 7) Grant execute permission on the function
grant execute on function public.is_admin(uuid) to authenticated;

-- 8) Optional: Set a specific user as admin (replace with actual user email)
-- update public.profiles 
-- set is_admin = true 
-- where email = 'admin@yourcompany.com';
