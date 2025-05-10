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

CREATE POLICY "Superadmins have full control" ON public.members
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.members m WHERE m.id = (select auth.uid()) AND m.role = 'superadmin'::user_role));

CREATE POLICY "Superadmins have full control" ON public.announcements
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.members m WHERE m.id = (select auth.uid()) AND m.role = 'superadmin'::user_role));

CREATE POLICY "Superadmins have full control" ON public.comments
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.members m WHERE m.id = (select auth.uid()) AND m.role = 'superadmin'::user_role));

CREATE POLICY "Superadmins have full control" ON public.communities
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.members m WHERE m.id = (select auth.uid()) AND m.role = 'superadmin'::user_role));

CREATE POLICY "Superadmins have full control" ON public.events
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.members m WHERE m.id = (select auth.uid()) AND m.role = 'superadmin'::user_role));

CREATE POLICY "Superadmins have full control" ON public.contributions
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.members m WHERE m.id = (select auth.uid()) AND m.role = 'superadmin'::user_role));

CREATE POLICY "Superadmins have full control" ON public.event_registrations
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.members m WHERE m.id = (select auth.uid()) AND m.role = 'superadmin'::user_role));

CREATE POLICY "Superadmins have full control" ON public.community_invites
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.members m WHERE m.id = (select auth.uid()) AND m.role = 'superadmin'::user_role));

CREATE POLICY "Superadmins have full control" ON public.likes
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.members m WHERE m.id = (select auth.uid()) AND m.role = 'superadmin'::user_role));

CREATE POLICY "Superadmins have full control" ON public.non_financial_members
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.members m WHERE m.id = (select auth.uid()) AND m.role = 'superadmin'::user_role));

CREATE POLICY "Superadmins have full control" ON public.notifications
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.members m WHERE m.id = (select auth.uid()) AND m.role = 'superadmin'::user_role));