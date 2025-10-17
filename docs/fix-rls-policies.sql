-- Fix RLS policies for worklogs table
-- This script ensures proper security for worklogs access

-- 1. Enable RLS on worklogs table
ALTER TABLE public.worklogs ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view own worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "Users can insert own worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "Users can update own worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "Users can delete own worklogs" ON public.worklogs;
DROP POLICY IF EXISTS "Admins can view all worklogs" ON public.worklogs;

-- 3. Create proper RLS policies

-- Policy 1: Users can view their own worklogs
CREATE POLICY "Users can view own worklogs" ON public.worklogs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own worklogs
CREATE POLICY "Users can insert own worklogs" ON public.worklogs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own worklogs
CREATE POLICY "Users can update own worklogs" ON public.worklogs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own worklogs
CREATE POLICY "Users can delete own worklogs" ON public.worklogs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy 5: Admins can view all worklogs
CREATE POLICY "Admins can view all worklogs" ON public.worklogs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policy 6: Admins can update all worklogs
CREATE POLICY "Admins can update all worklogs" ON public.worklogs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles 
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_roles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policy 7: Admins can delete all worklogs
CREATE POLICY "Admins can delete all worklogs" ON public.worklogs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 4. Test the policies
-- This should return 0 rows for anonymous users
-- This should return user's own worklogs for authenticated users
-- This should return all worklogs for admin users

-- 5. Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'worklogs' AND schemaname = 'public';

-- 6. List all policies
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'worklogs' AND schemaname = 'public'
ORDER BY policyname;


