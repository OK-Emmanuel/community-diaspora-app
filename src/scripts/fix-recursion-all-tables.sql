-- Comprehensive fix for infinite recursion in RLS policies
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

-- Drop the superadmin policies from all tables that might cause recursion
DROP POLICY IF EXISTS "Superadmins have full control" ON public.members;
DROP POLICY IF EXISTS "Superadmins have full control" ON public.announcements;
DROP POLICY IF EXISTS "Superadmins have full control" ON public.comments;
DROP POLICY IF EXISTS "Superadmins have full control" ON public.communities;
DROP POLICY IF EXISTS "Superadmins have full control" ON public.events;
DROP POLICY IF EXISTS "Superadmins have full control" ON public.contributions;
DROP POLICY IF EXISTS "Superadmins have full control" ON public.event_registrations;
DROP POLICY IF EXISTS "Superadmins have full control" ON public.community_invites;
DROP POLICY IF EXISTS "Superadmins have full control" ON public.likes;
DROP POLICY IF EXISTS "Superadmins have full control" ON public.non_financial_members;
DROP POLICY IF EXISTS "Superadmins have full control" ON public.notifications;
DROP POLICY IF EXISTS "Superadmins have full control" ON public.posts;

-- Create the new policies using the helper function
CREATE POLICY "Superadmins have full control" ON public.members
FOR ALL TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

CREATE POLICY "Superadmins have full control" ON public.announcements
FOR ALL TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

CREATE POLICY "Superadmins have full control" ON public.comments
FOR ALL TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

CREATE POLICY "Superadmins have full control" ON public.communities
FOR ALL TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

CREATE POLICY "Superadmins have full control" ON public.events
FOR ALL TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

CREATE POLICY "Superadmins have full control" ON public.contributions
FOR ALL TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

CREATE POLICY "Superadmins have full control" ON public.event_registrations
FOR ALL TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

CREATE POLICY "Superadmins have full control" ON public.community_invites
FOR ALL TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

CREATE POLICY "Superadmins have full control" ON public.likes
FOR ALL TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

CREATE POLICY "Superadmins have full control" ON public.non_financial_members
FOR ALL TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

CREATE POLICY "Superadmins have full control" ON public.notifications
FOR ALL TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

CREATE POLICY "Superadmins have full control" ON public.posts
FOR ALL TO authenticated
USING (public.is_superadmin())
WITH CHECK (public.is_superadmin());

-- Commit the transaction
COMMIT; 