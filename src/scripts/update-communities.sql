CREATE POLICY "Admins can view their own community details"
ON public.communities
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid()
          AND m.role = 'admin'::user_role
          AND m.community_id = communities.id -- The community row's ID matches the admin's community_id
    )
);

CREATE POLICY "Admins can update their own community details"
ON public.communities
FOR UPDATE
TO authenticated -- Applies to logged-in users
USING (
    EXISTS ( -- Ensures the row being updated is the admin's own community
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid()
          AND m.role = 'admin'::user_role
          AND m.community_id = communities.id -- The community row's ID matches the admin's community_id
    )
)
WITH CHECK (
    EXISTS ( -- Ensures after the update, it's still consistent with the admin's community
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid()
          AND m.role = 'admin'::user_role
          AND m.community_id = communities.id
    )
    -- Add any other checks, e.g., ensure 'name' is not empty if that's a business rule.
    -- AND communities.name IS NOT NULL AND length(trim(communities.name)) > 0
);

DROP POLICY IF EXISTS "Superadmins can create communities" ON public.communities;
DROP POLICY IF EXISTS "Superadmins can delete all communities" ON public.communities;
DROP POLICY IF EXISTS "Superadmins can do all things" ON public.communities; -- Assuming this is the JWT one for this table
DROP POLICY IF EXISTS "Superadmins can read all communities" ON public.communities;
DROP POLICY IF EXISTS "Superadmins can update all communities" ON public.communities;

CREATE POLICY "Superadmins have full control over communities"
ON public.communities
FOR ALL -- Covers SELECT, INSERT, UPDATE, DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid() AND m.role = 'superadmin'::user_role
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid() AND m.role = 'superadmin'::user_role
    )
);
