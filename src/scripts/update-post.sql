--------------------------------------------------------------------------------
-- POLICIES FOR: public.posts
--------------------------------------------------------------------------------

-- SELECT Policies for 'posts'
-- Dropping old/redundant SELECT policies
DROP POLICY IF EXISTS "Anyone can read posts" ON public.posts;
DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;
DROP POLICY IF EXISTS "read_posts" ON public.posts;
-- This one was created based on add-community-to-posts.sql,
-- let's ensure it's exactly what we want or replace it.
DROP POLICY IF EXISTS "Community members can view community posts" ON public.posts;

-- Policy: Authenticated members can view posts from their own community.
CREATE POLICY "Members can view posts from their own community"
ON public.posts
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid() AND m.community_id = posts.community_id
    )
);

-- Policy: Superadmins can view all posts (already covered by the generic "Superadmins can do all things" policy if it's an * policy)
-- No specific new SELECT policy needed for superadmins if the * policy exists and is:
-- "Superadmins can do all things", *, public, (((auth.jwt() ->> 'role'::text) = 'superadmin'::text) OR ((((auth.jwt() -> 'user_metadata'::text) ->> 'is_super_admin'::text))::boolean = true)), null
-- If you need a specific admin policy for SELECT for all communities, let me know.

-- INSERT Policies for 'posts'
-- Dropping old/redundant INSERT policies
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.posts;
DROP POLICY IF EXISTS "create_posts" ON public.posts;

-- Policy: Authenticated members can create posts (community_id will be set by trigger).
CREATE POLICY "Members can create posts"
ON public.posts
FOR INSERT
TO authenticated
WITH CHECK (
    posts.author_id = auth.uid() AND
    EXISTS ( -- Ensure the author is an active member of a community
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid()
          AND m.community_id IS NOT NULL -- Or any other status checks for the author
          AND m.status = 'active'::member_status
    )
    -- The trigger 'auto_set_post_community_id' should handle setting posts.community_id.
    -- The constraint 'check_post_community_id_matches_author' (if you added it from the script)
    -- or the trigger 'enforce_community_match_trigger' (from your dump)
    -- will ensure posts.community_id aligns with the author's community.
);

-- UPDATE Policies for 'posts'
-- Dropping old/redundant UPDATE policies
DROP POLICY IF EXISTS "Authors can update their posts" ON public.posts;
DROP POLICY IF EXISTS "update_posts" ON public.posts;

-- Policy: Authors can update their own posts.
CREATE POLICY "Authors can update their own posts"
ON public.posts
FOR UPDATE
TO authenticated
USING (posts.author_id = auth.uid())
WITH CHECK (
    posts.author_id = auth.uid()
    -- The 'enforce_community_match_trigger' from your dump should prevent changing community_id
    -- in a way that mismatches the author's current community if community_id is part of the update.
    -- If community_id is not updatable, even better.
);
-- If Admins (non-superadmin) need to update posts (e.g. for moderation), we need a separate policy.

-- Policy: Admins (non-superadmin) can update any post within their own community (for moderation).
CREATE POLICY "Admins can update posts in their community"
ON public.posts
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid()
          AND m.role = 'admin'::user_role
          AND m.community_id = posts.community_id -- Admin's community matches post's community
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid()
          AND m.role = 'admin'::user_role
          AND m.community_id = posts.community_id -- Ensures admin doesn't change post to a different community
                                                 -- or that check is handled by other constraints/triggers.
                                                 -- The main goal here for WITH CHECK is to ensure the row
                                                 -- still meets the USING criteria *after* the update for this policy.
    )
    -- Note: The 'enforce_community_match_trigger' from your dump should prevent changing
    -- posts.community_id in a way that mismatches the original author's community,
    -- which is a good protective measure. Admins updating a post shouldn't change its fundamental community affiliation
    -- unless that's a specific feature.
);

-- DELETE Policies for 'posts'
-- Dropping old/redundant DELETE policies
DROP POLICY IF EXISTS "Authors can delete their posts" ON public.posts;
DROP POLICY IF EXISTS "delete_posts" ON public.posts;

-- Policy: Authors can delete their own posts.
CREATE POLICY "Authors can delete their own posts"
ON public.posts
FOR DELETE
TO authenticated
USING (posts.author_id = auth.uid());

-- Policy: Admins (non-superadmin) can delete any post within their own community (for moderation).
-- (This is an example, adjust if admins should delete posts across all communities)
CREATE POLICY "Admins can delete posts in their community"
ON public.posts
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid()
          AND m.role = 'admin'::user_role
          AND m.community_id = posts.community_id
    )
);
-- The "Superadmins can do all things" policy for 'posts' covers deletion by superadmins.
