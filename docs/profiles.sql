-- Profiles table synced with Supabase Auth
-- Run this script in Supabase SQL Editor

-- 1) Create table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text generated always as (auth.email()) stored,
  full_name text,
  employee_id text unique,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2) RLS
alter table public.profiles enable row level security;

-- Allow user to read/update own profile
drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile" on public.profiles
for select to authenticated
using (id = auth.uid());

drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile" on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- 3) Trigger to insert on new user using metadata
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, employee_id)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', null), coalesce(new.raw_user_meta_data->>'employee_id', null))
  on conflict (id) do update set
    full_name = excluded.full_name,
    employee_id = excluded.employee_id,
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Optional: keep updated_at fresh on updates
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();


