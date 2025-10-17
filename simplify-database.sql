-- Simplify database: Remove admin_roles and keep only worklogs
-- Run this in Supabase SQL Editor

-- 1. Drop all admin_roles related policies first
DROP POLICY IF EXISTS "Users can view admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Users can insert admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Users can update admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Users can delete admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Admins can view all admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Admins can manage admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "admin_roles_select_policy" ON public.admin_roles;
DROP POLICY IF EXISTS "admin_roles_insert_policy" ON public.admin_roles;
DROP POLICY IF EXISTS "admin_roles_update_policy" ON public.admin_roles;
DROP POLICY IF EXISTS "admin_roles_delete_policy" ON public.admin_roles;
DROP POLICY IF EXISTS "admin_roles_access" ON public.admin_roles;

-- 2. Drop all worklogs policies
DROP POLICY IF EXISTS "Users can view own worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "Users can insert own worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "Users can update own worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "Users can delete own worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "Admins can view all worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "Admins can update all worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "Admins can delete all worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "authenticated_users_own_worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "authenticated_users_insert_worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "authenticated_users_update_worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "authenticated_users_delete_worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "admin_view_all_worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "worklogs_select_policy" ON public.worklogs;
DROP POLICY IF EXISTS "worklogs_insert_policy" ON public.worklogs;
DROP POLICY IF EXISTS "worklogs_update_policy" ON public.worklogs;
DROP POLICY IF EXISTS "worklogs_delete_policy" ON public.worklogs;
DROP POLICY IF EXISTS "worklogs_user_access" ON public.worklogs;

-- 3. Drop admin_roles table completely
DROP TABLE IF EXISTS public.admin_roles CASCADE;

-- 4. Drop user_profiles_with_admin view (depends on admin_roles)
DROP VIEW IF EXISTS public.user_profiles_with_admin CASCADE;

-- 5. Create simple user_profiles view without admin
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT 
  u.id,
  u.email,
  u.created_at,
  u.updated_at,
  COALESCE(up.full_name, split_part(u.email, '@', 1)) as full_name,
  COALESCE(up.employee_id, '') as employee_id
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.id;

-- 6. Create simple RLS policies for worklogs only
ALTER TABLE public.worklogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "worklogs_user_only" ON public.worklogs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. Grant permissions
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT ALL ON public.worklogs TO authenticated;

-- 8. Test the setup
SELECT 'Database simplified successfully' as status;


