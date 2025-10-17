-- Proper RLS fix with correct syntax
-- This will create working RLS policies

-- 1. Enable RLS on worklogs
ALTER TABLE public.worklogs ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies
DROP POLICY IF EXISTS "Users can view own worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "Users can insert own worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "Users can update own worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "Users can delete own worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "Admins can view all worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "Admins can update all worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "Admins can delete all worklogs" ON public.worklogs;

-- 3. Create simple, working policies

-- Policy 1: Allow authenticated users to view their own worklogs
CREATE POLICY "authenticated_users_own_worklogs" ON public.worklogs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 2: Allow authenticated users to insert their own worklogs
CREATE POLICY "authenticated_users_insert_worklogs" ON public.worklogs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Allow authenticated users to update their own worklogs
CREATE POLICY "authenticated_users_update_worklogs" ON public.worklogs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Allow authenticated users to delete their own worklogs
CREATE POLICY "authenticated_users_delete_worklogs" ON public.worklogs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Create admin policies (optional - for admin access)
CREATE POLICY "admin_view_all_worklogs" ON public.worklogs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 5. Verify policies
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'worklogs' AND schemaname = 'public'
ORDER BY policyname;

-- 6. Test the setup
-- This should now work for authenticated users


