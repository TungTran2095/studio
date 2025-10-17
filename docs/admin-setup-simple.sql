-- Admin system setup for worklog application (SIMPLE VERSION)
-- Run this script in Supabase SQL Editor

-- 1) Create admin_roles table
create table if not exists public.admin_roles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2) Enable RLS on admin_roles table
alter table public.admin_roles enable row level security;

-- 3) Create simple RLS policies for admin_roles
-- Allow users to read their own admin status
drop policy if exists "Users can read own admin status" on public.admin_roles;
create policy "Users can read own admin status" on public.admin_roles
for select to authenticated
using (id = auth.uid());

-- Allow service role to manage admin roles (for initial setup)
drop policy if exists "Service role can manage admin roles" on public.admin_roles;
create policy "Service role can manage admin roles" on public.admin_roles
for all to service_role
using (true)
with check (true);

-- 4) Create function to check if user is admin
create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean as $$
begin
  return exists (
    select 1 from public.admin_roles 
    where id = user_id and is_admin = true
  );
end;
$$ language plpgsql security definer;

-- 5) Grant execute permission on the function
grant execute on function public.is_admin(uuid) to authenticated;

-- 6) Create trigger to automatically create admin_roles entry for new users
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

-- 7) Update RLS policies for other tables to use admin_roles
-- Allow admins to read all worklogs
drop policy if exists "Admins can read all worklogs" on public.worklogs;
create policy "Admins can read all worklogs" on public.worklogs
for select to authenticated
using (
  exists (
    select 1 from public.admin_roles 
    where id = auth.uid() and is_admin = true
  )
);

-- Allow admins to read all chat conversations
drop policy if exists "Admins can read all conversations" on public.chat_conversations;
create policy "Admins can read all conversations" on public.chat_conversations
for select to authenticated
using (
  exists (
    select 1 from public.admin_roles 
    where id = auth.uid() and is_admin = true
  )
);

-- Allow admins to read all chat messages
drop policy if exists "Admins can read all messages" on public.chat_messages;
create policy "Admins can read all messages" on public.chat_messages
for select to authenticated
using (
  exists (
    select 1 from public.admin_roles 
    where id = auth.uid() and is_admin = true
  )
);

-- 8) Create a view that combines auth_users_extended with admin status
create or replace view public.user_profiles_with_admin as
select 
  aue.*,
  ar.is_admin,
  ar.created_at as admin_role_created_at,
  ar.updated_at as admin_role_updated_at
from public.auth_users_extended aue
left join public.admin_roles ar on aue.id = ar.id;

-- 9) IMPORTANT: Set the first admin manually
-- Replace 'your-admin-email@example.com' with the actual admin email
-- This needs to be done after running the script above
/*
-- Get the user ID and set as admin
insert into public.admin_roles (id, is_admin)
values (
  (select id from auth.users where email = 'your-admin-email@example.com'), 
  true
)
on conflict (id) do update set is_admin = true;
*/


