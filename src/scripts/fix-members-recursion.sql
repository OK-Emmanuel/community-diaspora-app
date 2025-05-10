-- Fix for infinite recursion in members table policies
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

-- Create a dedicated function to check if a user is an admin for a specific community
CREATE OR REPLACE FUNCTION public.is_admin_for_community(community_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Direct query without using RLS policies (SECURITY DEFINER)
  SELECT (role = 'admin'::user_role AND community_id = community_uuid) INTO is_admin
  FROM public.members
  WHERE id = auth.uid();
  
  RETURN COALESCE(is_admin, false);
END;
$$;

-- Create a function to check if a user belongs to a specific community
CREATE OR REPLACE FUNCTION public.is_member_of_community(community_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  belongs boolean;
BEGIN
  -- Direct query without using RLS policies (SECURITY DEFINER)
  SELECT (community_id = community_uuid) INTO belongs
  FROM public.members
  WHERE id = auth.uid();
  
  RETURN COALESCE(belongs, false);
END;
$$;

-- Drop all problematic policies on members table that cause recursion
DROP POLICY IF EXISTS "Admins can view member profiles in their community" ON public.members;
DROP POLICY IF EXISTS "Members can view other members in their community" ON public.members;
DROP POLICY IF EXISTS "Superadmins have full control" ON public.members;
DROP POLICY IF EXISTS "Superadmins have full control over members" ON public.members;

-- Create new policies using the helper functions to avoid recursion
CREATE POLICY "Superadmins have full control over members"
ON public.members
FOR ALL
TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

CREATE POLICY "Admins can view member profiles in their community"
ON public.members
FOR SELECT
TO authenticated
USING (public.is_admin_for_community(community_id));

CREATE POLICY "Members can view other members in their community"
ON public.members
FOR SELECT
TO authenticated
USING (public.is_member_of_community(community_id));

-- Commit the transaction
COMMIT; 