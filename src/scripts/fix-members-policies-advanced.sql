-- Advanced fix for infinite recursion in members table policies
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

-- Function to check if user is a community admin
CREATE OR REPLACE FUNCTION public.is_admin_for_community(community_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT (role = 'admin'::user_role AND community_id = community_uuid) INTO is_admin
  FROM public.members
  WHERE id = auth.uid();
  
  RETURN COALESCE(is_admin, false);
END;
$$;

-- Function to check if user is a member of a community
CREATE OR REPLACE FUNCTION public.is_member_of_community(community_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  belongs boolean;
BEGIN
  SELECT (community_id = community_uuid) INTO belongs
  FROM public.members
  WHERE id = auth.uid();
  
  RETURN COALESCE(belongs, false);
END;
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role public.user_role;
BEGIN
  SELECT role INTO user_role
  FROM public.members
  WHERE id = auth.uid();
  
  RETURN user_role;
END;
$$;

-- Function to get user community ID
CREATE OR REPLACE FUNCTION public.get_user_community_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  community_id uuid;
BEGIN
  SELECT m.community_id INTO community_id
  FROM public.members m
  WHERE m.id = auth.uid();
  
  RETURN community_id;
END;
$$;

-- Drop all potentially recursive policies from the members table
DROP POLICY IF EXISTS "Admins can view member profiles in their community" ON public.members;
DROP POLICY IF EXISTS "Members can view other members in their community" ON public.members;
DROP POLICY IF EXISTS "Members can view their own full profile" ON public.members;
DROP POLICY IF EXISTS "Admins can update member profiles in their community" ON public.members;
DROP POLICY IF EXISTS "Members can update their own profile" ON public.members;
DROP POLICY IF EXISTS "New users can create their profile (with role protection)" ON public.members;
DROP POLICY IF EXISTS "Superadmins have full control" ON public.members;
DROP POLICY IF EXISTS "Superadmins have full control over members" ON public.members;

-- Create new policies using our helper functions to avoid recursion
CREATE POLICY "Superadmins have full control"
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

CREATE POLICY "Members can view their own full profile"
ON public.members
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins can update member profiles in their community"
ON public.members
FOR UPDATE
TO authenticated
USING (
  public.is_admin_for_community(community_id) AND 
  id <> auth.uid()
)
WITH CHECK (
  public.is_admin_for_community(community_id) AND 
  id <> auth.uid() AND
  (role <> ALL (ARRAY['admin'::user_role, 'superadmin'::user_role]) OR 
   role = (SELECT role FROM members WHERE id = members.id)) AND
  community_id = (SELECT community_id FROM members WHERE id = members.id)
);

CREATE POLICY "Members can update their own profile"
ON public.members
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND
  role = public.get_user_role() AND
  community_id = public.get_user_community_id()
);

CREATE POLICY "New users can create their profile (with role protection)"
ON public.members
FOR INSERT
TO authenticated, anon
WITH CHECK (
  (role IS NULL) OR 
  (role = ANY (ARRAY['financial'::user_role, 'non_financial'::user_role]))
);

-- Commit the transaction
COMMIT; 