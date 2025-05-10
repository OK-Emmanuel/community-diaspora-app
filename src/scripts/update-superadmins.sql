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

-- Ensure the function is created before policies that use it
CREATE OR REPLACE FUNCTION is_superadmin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
-- Set a safe search_path to prevent hijacking
SET search_path = public
AS $$
DECLARE
  is_super boolean;
BEGIN
  SELECT role = 'superadmin'::user_role INTO is_super
  FROM members
  WHERE id = user_id;
  RETURN COALESCE(is_super, false);
END;
$$;

CREATE POLICY "Superadmins have full control" ON public.members
FOR ALL
TO authenticated
USING (is_superadmin(auth.uid()))
WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins have full control" ON public.announcements
FOR ALL
TO authenticated
USING (is_superadmin(auth.uid()))
WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins have full control" ON public.comments
FOR ALL
TO authenticated
USING (is_superadmin(auth.uid()))
WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins have full control" ON public.communities
FOR ALL
TO authenticated
USING (is_superadmin(auth.uid()))
WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins have full control" ON public.events
FOR ALL
TO authenticated
USING (is_superadmin(auth.uid()))
WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins have full control" ON public.contributions
FOR ALL
TO authenticated
USING (is_superadmin(auth.uid()))
WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins have full control" ON public.event_registrations
FOR ALL
TO authenticated
USING (is_superadmin(auth.uid()))
WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins have full control" ON public.community_invites
FOR ALL
TO authenticated
USING (is_superadmin(auth.uid()))
WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins have full control" ON public.likes
FOR ALL
TO authenticated
USING (is_superadmin(auth.uid()))
WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins have full control" ON public.non_financial_members
FOR ALL
TO authenticated
USING (is_superadmin(auth.uid()))
WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins have full control" ON public.notifications
FOR ALL
TO authenticated
USING (is_superadmin(auth.uid()))
WITH CHECK (is_superadmin(auth.uid()));