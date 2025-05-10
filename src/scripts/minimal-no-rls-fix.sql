-- Emergency fix for members table - bypass RLS for admins/superadmins
BEGIN;

-- Create a function that checks if a user is an admin or superadmin
CREATE OR REPLACE FUNCTION public.is_admin_or_superadmin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Direct query without using RLS (SECURITY DEFINER)
  SELECT (role = 'admin'::user_role OR role = 'superadmin'::user_role) INTO is_admin
  FROM public.members
  WHERE id = auth.uid();
  
  RETURN COALESCE(is_admin, false);
END;
$$;

-- Drop and recreate the RLS policy
-- Temporary extreme solution: Allow admins and superadmins to completely bypass RLS 
-- Note: This is a temporary measure until a more granular solution can be implemented
DROP POLICY IF EXISTS "Admins bypass RLS" ON public.members;

CREATE POLICY "Admins bypass RLS"
ON public.members
FOR ALL
TO authenticated
USING (public.is_admin_or_superadmin())
WITH CHECK (public.is_admin_or_superadmin());

-- Keep the id = auth.uid() policy for regular users to view/edit their own profile
DROP POLICY IF EXISTS "Users can access their own profile" ON public.members;

CREATE POLICY "Users can access their own profile"
ON public.members
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

COMMIT; 