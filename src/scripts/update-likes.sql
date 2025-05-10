--------------------------------------------------------------------------------
-- SCHEMA MODIFICATIONS FOR: public.likes
--------------------------------------------------------------------------------

-- Add community_id column to likes table.
ALTER TABLE public.likes ADD COLUMN IF NOT EXISTS community_id UUID;

-- Optional: Add a foreign key constraint.
-- ALTER TABLE public.likes
--   ADD CONSTRAINT fk_likes_community FOREIGN KEY (community_id)
--   REFERENCES public.communities(id) ON DELETE SET NULL; -- Or CASCADE if likes should be removed if community is deleted

-- Backfill community_id for existing likes based on the post's community_id.
UPDATE public.likes l
SET community_id = (
    SELECT p.community_id
    FROM public.posts p
    WHERE p.id = l.post_id
)
WHERE l.community_id IS NULL AND l.post_id IS NOT NULL;

-- Trigger to automatically set community_id on new likes from the parent post.
CREATE OR REPLACE FUNCTION set_like_community_id_from_post()
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

DROP TRIGGER IF EXISTS auto_set_like_community_id ON public.likes;
CREATE TRIGGER auto_set_like_community_id
BEFORE INSERT ON public.likes
FOR EACH ROW
EXECUTE FUNCTION set_like_community_id_from_post();

-- Index for faster community-based filtering of likes
CREATE INDEX IF NOT EXISTS idx_likes_community_id ON public.likes(community_id);

--------------------------------------------------------------------------------
-- POLICIES FOR: public.likes
--------------------------------------------------------------------------------

-- SELECT Policies for 'likes'
DROP POLICY IF EXISTS "read_likes" ON public.likes;

-- Policy: Authenticated members can see 'like' entries associated with posts in their own community.
CREATE POLICY "Members can view likes in their community"
ON public.likes
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.members m
        WHERE m.id = auth.uid() AND m.community_id = likes.community_id
    )
);

-- INSERT Policies for 'likes'
DROP POLICY IF EXISTS "create_likes" ON public.likes;
CREATE POLICY "Members can like posts in their community"
ON public.likes
FOR INSERT
TO authenticated
WITH CHECK (
    likes.user_id = auth.uid() AND
    EXISTS ( -- Ensure the user is a member of the community where the post exists
        SELECT 1
        FROM public.members m
        JOIN public.posts p ON m.community_id = p.community_id -- Assumes members.community_id and posts.community_id are reliable
        WHERE m.id = auth.uid() AND p.id = likes.post_id
    ) AND
    likes.community_id IS NOT NULL -- Ensure the like is associated with a community (via post)
);

-- DELETE Policies for 'likes' (Unliking)
DROP POLICY IF EXISTS "delete_likes" ON public.likes;
CREATE POLICY "Members can unlike posts they liked"
ON public.likes
FOR DELETE
TO authenticated
USING (
    likes.user_id = auth.uid() AND
    EXISTS ( -- Ensure the user is a member of the community where the post exists
        SELECT 1
        FROM public.members m
        JOIN public.posts p ON m.community_id = p.community_id -- Assumes members.community_id and posts.community_id are reliable
        WHERE m.id = auth.uid() AND p.id = likes.post_id
    )
);

-- NO UPDATE policy for likes is typically needed. Users either like (insert) or unlike (delete).

-- Superadmin policy for 'likes'
-- This is handled by your standardized "Superadmins have full control" policy
-- in src/scripts/update-superadmins.sql. Ensure 'likes' is covered there.

--------------------------------------------------------------------------------
-- END OF POLICIES FOR: public.likes
--------------------------------------------------------------------------------
