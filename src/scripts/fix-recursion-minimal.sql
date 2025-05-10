-- Minimal fix for infinite recursion in members table policies
BEGIN;

-- Create a dedicated function to check if a user is a superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_super boolean;
BEGIN
  -- Direct query without using RLS policies (SECURITY DEFINER)
  SELECT role = 'superadmin'::user_role INTO is_super
  FROM public.members
  WHERE id = auth.uid();
  
  RETURN COALESCE(is_super, false);
END;
$$;

-- Drop the problematic policy that is likely causing the recursion
DROP POLICY IF EXISTS "Superadmins have full control" ON public.members;

-- Re-create the policy using our helper function
CREATE POLICY "Superadmins have full control"
ON public.members
FOR ALL
TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Commit the transaction
COMMIT; 