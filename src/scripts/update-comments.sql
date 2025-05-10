--------------------------------------------------------------------------------
-- SCHEMA MODIFICATIONS FOR: public.comments
--------------------------------------------------------------------------------

-- Add community_id column to comments table.
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS community_id UUID;

-- Optional: Add a foreign key constraint.
-- ALTER TABLE public.comments
--   ADD CONSTRAINT fk_comments_community FOREIGN KEY (community_id)
--   REFERENCES public.communities(id) ON DELETE SET NULL;

-- Backfill community_id for existing comments based on the post's community_id.
-- This assumes posts table already has community_id populated.
UPDATE public.comments c
SET community_id = (
    SELECT p.community_id
    FROM public.posts p
    WHERE p.id = c.post_id
)
WHERE c.community_id IS NULL AND c.post_id IS NOT NULL;

-- Trigger to automatically set community_id on new comments from the parent post.
CREATE OR REPLACE FUNCTION set_comment_community_id_from_post()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.post_id IS NOT NULL AND NEW.community_id IS NULL THEN
    SELECT p.community_id INTO NEW.community_id
    FROM public.posts p
    WHERE p.id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_set_comment_community_id ON public.comments;
CREATE TRIGGER auto_set_comment_community_id
BEFORE INSERT ON public.comments
FOR EACH ROW
EXECUTE FUNCTION set_comment_community_id_from_post();

-- Index for faster community-based filtering of comments (though usually done via post)
CREATE INDEX IF NOT EXISTS idx_comments_community_id ON public.comments(community_id);

--------------------------------------------------------------------------------
-- POLICIES FOR: public.comments
--------------------------------------------------------------------------------

-- SELECT Policies for 'comments'
-- Dropping old/redundant SELECT policies
DROP POLICY IF EXISTS "Anyone can read comments" ON public.comments;
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
DROP POLICY IF EXISTS "read_comments" ON public.comments;

-- Policy: Authenticated members can view comments on posts within their own community.
CREATE POLICY "Members can view comments in their community"
ON public.comments
FOR SELECT
TO authenticated
USING (
    EXISTS ( -- Check if the member belongs to the comment's community
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid() AND m.community_id = comments.community_id
    )
);
-- Superadmins covered by their global policy.

-- INSERT Policies for 'comments'
-- Dropping old/redundant INSERT policies
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.comments;
DROP POLICY IF EXISTS "create_comments" ON public.comments;

-- Policy: Authenticated members can create comments on posts in their community.
CREATE POLICY "Members can create comments"
ON public.comments
FOR INSERT
TO authenticated
WITH CHECK (
    comments.author_id = auth.uid() AND
    EXISTS ( -- Ensure the author is an active member of the comment's community
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid()
          AND m.community_id = comments.community_id -- community_id is set by trigger from post
          AND m.status = 'active'::member_status
    ) AND
    EXISTS ( -- Ensure the post being commented on is in a community the user can access (redundant if select on post is secure)
        SELECT 1
        FROM public.posts p
        WHERE p.id = comments.post_id AND p.community_id = comments.community_id
    )
);
-- Superadmins covered by their global policy.

-- UPDATE Policies for 'comments'
-- Dropping old/redundant UPDATE policies
DROP POLICY IF EXISTS "Authors can update their comments" ON public.comments;
DROP POLICY IF EXISTS "update_comments" ON public.comments;

-- Policy: Authors can update their own comments.
CREATE POLICY "Authors can update their own comments"
ON public.comments
FOR UPDATE
TO authenticated
USING (comments.author_id = auth.uid())
WITH CHECK (
    comments.author_id = auth.uid() AND
    EXISTS ( -- Ensure the author is still part of the comment's community (in case they moved)
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid()
          AND m.community_id = comments.community_id
    )
);

-- Policy: Admins can update their OWN comments within their community.
-- (This is covered by "Authors can update their own comments" if admin is the author)
-- No separate admin update policy needed if they only manage their own.
-- Superadmins covered by their global policy.

-- DELETE Policies for 'comments'
-- Dropping old/redundant DELETE policies
DROP POLICY IF EXISTS "delete_comments" ON public.comments; -- This one allowed admin deletion of others' comments.

-- Policy: Authors can delete their own comments.
CREATE POLICY "Authors can delete their own comments"
ON public.comments
FOR DELETE
TO authenticated
USING (comments.author_id = auth.uid());

-- Policy: Admins can delete any comment within their own community (for moderation).
CREATE POLICY "Admins can delete comments in their community"
ON public.comments
FOR DELETE
TO authenticated -- Applies to logged-in users
USING (
    EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid()
          AND m.role = 'admin'::user_role
          AND m.community_id = comments.community_id -- Admin's community matches comment's community
    )
);
-- This policy is now distinct from "Authors can delete their own comments".
-- Superadmins are also covered by their global policy for deletions.

--------------------------------------------------------------------------------
-- END OF POLICIES FOR: public.comments
--------------------------------------------------------------------------------
