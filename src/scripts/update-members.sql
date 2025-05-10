--------------------------------------------------------------------------------
-- POLICIES FOR: public.members
--------------------------------------------------------------------------------

-- SELECT Policies for 'members'
-- Dropping old/redundant SELECT policies
DROP POLICY IF EXISTS "Anyone can read basic member info" ON public.members;
DROP POLICY IF EXISTS "Anyone can read members" ON public.members;
DROP POLICY IF EXISTS "Members can view active members" ON public.members; -- This was too broad

-- Policy: Authenticated users can view basic information of members in THEIR OWN community.
-- Define what "basic information" means by selecting specific columns in your app.
-- This policy controls WHICH ROWS can be selected.
CREATE POLICY "Members can view other members in their community"
ON public.members
FOR SELECT
TO authenticated
USING (
    EXISTS ( -- Member checking must be in a community
        SELECT 1
        FROM public.members m_viewer
        WHERE m_viewer.id = auth.uid()
          AND m_viewer.community_id = members.community_id -- member being viewed is in same community
    )
);

-- Policy: Members can view their OWN complete profile.
CREATE POLICY "Members can view their own full profile"
ON public.members
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy: Admins can view full profiles of members within THEIR OWN community.
CREATE POLICY "Admins can view member profiles in their community"
ON public.members
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.members m_admin
        WHERE m_admin.id = auth.uid()
          AND m_admin.role = 'admin'::user_role
          AND m_admin.community_id = members.community_id -- member being viewed is in admin's community
    )
);

-- INSERT Policies for 'members'
-- The existing "New users can create their profile" is for registration.
-- This is special as it's often called by anon/auth functions.
-- DROP POLICY IF EXISTS "New users can create their profile" ON public.members;
-- CREATE POLICY "New users can create their profile"
-- ON public.members
-- FOR INSERT
-- TO authenticated, anon -- Keep as is if your Supabase auth flow relies on this.
-- WITH CHECK (true); -- This is very permissive. Application MUST validate.
--                     -- And ensure 'role' is not set to 'admin' or 'superadmin' by this policy.
--                     -- A trigger might be good here to default role and prevent escalation.

-- Let's refine the INSERT to prevent role escalation during signup through this permissive policy.
DROP POLICY IF EXISTS "New users can create their profile" ON public.members;
CREATE POLICY "New users can create their profile (with role protection)"
ON public.members
FOR INSERT
TO authenticated, anon
WITH CHECK (
    true AND -- Allows insert
    (role IS NULL OR role IN ('financial'::user_role, 'non_financial'::user_role)) -- Prevents setting privileged roles
                                                                              -- or ensure role defaults appropriately
                                                                              -- via a trigger or app logic.
    -- community_id should be set by the application during registration.
);

-- UPDATE Policies for 'members'
-- "Members can update own profile" is good. Let's ensure it's targetted correctly.
DROP POLICY IF EXISTS "Members can update own profile" ON public.members;
CREATE POLICY "Members can update their own profile"
ON public.members
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
    id = auth.uid() AND
    role = (SELECT m.role FROM public.members m WHERE m.id = auth.uid()) AND -- User cannot change their own role.
    community_id = (SELECT m.community_id FROM public.members m WHERE m.id = auth.uid()) -- User cannot change their own community_id by this.
    -- Other fields are updatable by user.
);

-- Policy: Admins can update profiles of members within THEIR OWN community.
-- (e.g., change status, correct info, but NOT change role to admin/superadmin or change community).
CREATE POLICY "Admins can update member profiles in their community"
ON public.members
FOR UPDATE
TO authenticated
USING (
    EXISTS ( -- Admin must be in the same community as the member being updated
        SELECT 1
        FROM public.members m_admin
        WHERE m_admin.id = auth.uid()
          AND m_admin.role = 'admin'::user_role
          AND m_admin.community_id = members.community_id
    ) AND members.id <> auth.uid() -- Admin is not updating themselves through this policy
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.members m_admin
        WHERE m_admin.id = auth.uid()
          AND m_admin.role = 'admin'::user_role
          AND m_admin.community_id = members.community_id
    ) AND
    members.id <> auth.uid() AND
    -- Admin cannot use this policy to escalate another user's role to admin/superadmin
    -- or change their own role on the target user if they were already admin.
    (members.role NOT IN ('admin'::user_role, 'superadmin'::user_role) OR members.role = (SELECT m.role FROM public.members m WHERE m.id = members.id)) AND
    -- Admin cannot change a member's community_id using this policy
    members.community_id = (SELECT m.community_id FROM public.members m WHERE m.id = members.id)
);


-- DELETE Policies for 'members'
-- Generally, members should not be hard deleted. Status changed to 'inactive' or 'suspended'.
-- If hard deletes are allowed:
-- DROP POLICY IF EXISTS "Admins can delete members in their community" ON public.members;
-- CREATE POLICY "Admins can delete members in their community"
-- ON public.members
-- FOR DELETE
-- TO authenticated
-- USING (
--     EXISTS (
--         SELECT 1
--         FROM public.members m_admin
--         WHERE m_admin.id = auth.uid()
--           AND m_admin.role = 'admin'::user_role
--           AND m_admin.community_id = members.community_id
--     ) AND members.role NOT IN ('admin'::user_role, 'superadmin'::user_role) -- Admins cannot delete other admins/superadmins
-- );


-- Superadmin policy for 'members' (using new standard)
DROP POLICY IF EXISTS "Superadmins can do anything" ON public.members; -- Assuming this is the JWT one

CREATE POLICY "Superadmins have full control over members"
ON public.members
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.members m WHERE m.id = auth.uid() AND m.role = 'superadmin'::user_role))
WITH CHECK (
    EXISTS (SELECT 1 FROM public.members m WHERE m.id = auth.uid() AND m.role = 'superadmin'::user_role)
    -- Superadmin WITH CHECK can be more complex if certain fields shouldn't be arbitrarily changed
    -- without further logic (e.g. member's community_id if it implies data migration elsewhere).
    -- For now, this allows full update.
);

--------------------------------------------------------------------------------
-- END OF POLICIES FOR: public.members
--------------------------------------------------------------------------------

-- Retroactively update superadmin policies for previously covered tables:
-- File: update-posts.sql
-- At the end of policies for posts:
DROP POLICY IF EXISTS "Superadmins can do all things" ON public.posts;
CREATE POLICY "Superadmins have full control over posts"
ON public.posts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.members m WHERE m.id = auth.uid() AND m.role = 'superadmin'::user_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.members m WHERE m.id = auth.uid() AND m.role = 'superadmin'::user_role));

-- File: update-announcements.sql (or wherever you put announcement policies)
-- At the end of policies for announcements:
DROP POLICY IF EXISTS "Superadmins can do all things" ON public.announcements;
CREATE POLICY "Superadmins have full control over announcements"
ON public.announcements FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.members m WHERE m.id = auth.uid() AND m.role = 'superadmin'::user_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.members m WHERE m.id = auth.uid() AND m.role = 'superadmin'::user_role));

-- File: update-comments.sql
-- At the end of policies for comments:
DROP POLICY IF EXISTS "Superadmins can do all things" ON public.comments;
CREATE POLICY "Superadmins have full control over comments"
ON public.comments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.members m WHERE m.id = auth.uid() AND m.role = 'superadmin'::user_role))
WITH CHECK (EXISTS (SELECT 1 FROM public.members m WHERE m.id = auth.uid() AND m.role = 'superadmin'::user_role));
