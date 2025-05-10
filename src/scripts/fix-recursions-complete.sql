-- Complete fix for recursion issues in Supabase RLS policies
BEGIN;

-- Drop the current user details type if it exists
DROP TYPE IF EXISTS public.current_user_details_type CASCADE;

-- Recreate the composite type to hold user details
CREATE TYPE public.current_user_details_type AS (
  user_id uuid,
  user_role public.user_role,
  user_community_id uuid,
  user_status public.member_status,
  is_community_admin boolean
);

-- Create or replace the function to get current user details 
CREATE OR REPLACE FUNCTION public.get_current_user_details()
RETURNS public.current_user_details_type
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  details public.current_user_details_type;
BEGIN
  -- Direct fetch from the members table without any filters
  -- This avoids the recursion by not using any policies
  SELECT
    m.id,
    m.role,
    m.community_id,
    m.status,
    m.is_community_admin
  INTO details
  FROM public.members m
  WHERE m.id = auth.uid();

  RETURN details;
END;
$$;

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
  SELECT (community_id = community_uuid) INTO belongs
  FROM public.members
  WHERE id = auth.uid();
  
  RETURN COALESCE(belongs, false);
END;
$$;

-- Drop all potentially problematic policies on members table
DROP POLICY IF EXISTS "Admins can view member profiles in their community" ON public.members;
DROP POLICY IF EXISTS "Members can view other members in their community" ON public.members;
DROP POLICY IF EXISTS "Members can view their own full profile" ON public.members;
DROP POLICY IF EXISTS "Admins can update member profiles in their community" ON public.members;
DROP POLICY IF EXISTS "Members can update their own profile" ON public.members;
DROP POLICY IF EXISTS "New users can create their profile (with role protection)" ON public.members;
DROP POLICY IF EXISTS "Superadmins have full control" ON public.members;
DROP POLICY IF EXISTS "Superadmins have full control over members" ON public.members;

-- Recreate all the policies for the members table using our helper functions
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
  public.is_admin_for_community(community_id) AND id <> auth.uid()
)
WITH CHECK (
  public.is_admin_for_community(community_id) AND 
  id <> auth.uid() AND
  ((role <> ALL (ARRAY['admin'::user_role, 'superadmin'::user_role])) OR 
   (role = (SELECT m.role FROM members m WHERE m.id = members.id))) AND
  (community_id = (SELECT m.community_id FROM members m WHERE m.id = members.id))
);

CREATE POLICY "Members can update their own profile"
ON public.members
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND
  role = (SELECT m.role FROM members m WHERE m.id = auth.uid()) AND
  community_id = (SELECT m.community_id FROM members m WHERE m.id = auth.uid())
);

CREATE POLICY "New users can create their profile (with role protection)"
ON public.members
FOR INSERT
TO authenticated, anon
WITH CHECK (
  (role IS NULL) OR (role = ANY (ARRAY['financial'::user_role, 'non_financial'::user_role]))
);

-- Fix policies for comments, posts, announcements, etc. that might be causing recursion
-- Modify any other policies on other tables that have subqueries against members

-- Communities policies
DROP POLICY IF EXISTS "Admins can view their own community details" ON public.communities;
DROP POLICY IF EXISTS "Admins can update their own community details" ON public.communities;

CREATE POLICY "Admins can view their own community details"
ON public.communities
FOR SELECT
TO authenticated
USING (public.is_admin_for_community(id));

CREATE POLICY "Admins can update their own community details"
ON public.communities
FOR UPDATE
TO authenticated
USING (public.is_admin_for_community(id))
WITH CHECK (public.is_admin_for_community(id));

-- Commit the transaction
COMMIT; 