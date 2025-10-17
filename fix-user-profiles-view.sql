-- Fix user_profiles_with_admin view access
-- The 403 error suggests the view has permission issues

-- 1. Check if the view exists and its definition
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views 
WHERE viewname = 'user_profiles_with_admin' AND schemaname = 'public';

-- 2. Grant permissions on the view
GRANT SELECT ON public.user_profiles_with_admin TO authenticated;
GRANT SELECT ON public.user_profiles_with_admin TO anon;

-- 3. Grant permissions on underlying tables
GRANT SELECT ON public.auth_users_extended TO authenticated;
GRANT SELECT ON public.auth_users_extended TO anon;
GRANT SELECT ON public.admin_roles TO authenticated;
GRANT SELECT ON public.admin_roles TO anon;

-- 4. Recreate the view with proper permissions
DROP VIEW IF EXISTS public.user_profiles_with_admin;

CREATE VIEW public.user_profiles_with_admin AS
SELECT
  aue.*,
  COALESCE(ar.is_admin, false) as is_admin
FROM public.auth_users_extended aue
LEFT JOIN public.admin_roles ar ON aue.id = ar.id;

-- 5. Grant permissions on the new view
GRANT SELECT ON public.user_profiles_with_admin TO authenticated;
GRANT SELECT ON public.user_profiles_with_admin TO anon;

-- 6. Test the view
SELECT * FROM public.user_profiles_with_admin LIMIT 1;


