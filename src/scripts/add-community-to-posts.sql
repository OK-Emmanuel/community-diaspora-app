-- Add community_id column to posts table if it doesn't exist
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS community_id UUID;

-- Optional: Add a foreign key constraint if you want to enforce that
-- the community_id in posts must exist in the communities table.
-- Ensure that your posts.community_id will always have a valid corresponding entry
-- in public.communities.id before adding this constraint.
-- ALTER TABLE public.posts
--   ADD CONSTRAINT fk_posts_community FOREIGN KEY (community_id)
--   REFERENCES public.communities(id) ON DELETE SET NULL; -- Or ON DELETE CASCADE, depending on desired behavior

-- Backfill community_id for existing posts based on the author's community_id.
-- This assumes that posts.author_id is correctly populated and members have a community_id.
UPDATE public.posts p
SET community_id = (SELECT m.community_id FROM public.members m WHERE m.id = p.author_id)
WHERE p.community_id IS NULL AND p.author_id IS NOT NULL;

-- It's also good practice to ensure that new posts automatically get the author's community_id.
-- The trigger "enforce_community_match_trigger" and its function "enforce_community_match"
-- from your SQL dump (lines 300-315 and 639-642) seem to handle ensuring that
-- NEW.community_id matches the author's community_id if NEW.community_id is provided.
-- We should ensure that NEW.community_id IS ACTUALLY SET, ideally from the author's community.

-- Let's refine or ensure a trigger sets the community_id on insert if not provided.
-- The function 'set_community_id_on_post' from your local 'add-community-to-posts.sql' was good.
-- Let's define it here if it's not in your dump:

CREATE OR REPLACE FUNCTION set_post_community_id_from_author()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.community_id IS NULL THEN
    SELECT community_id INTO NEW.community_id
    FROM public.members
    WHERE id = NEW.author_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_set_post_community_id ON public.posts;
CREATE TRIGGER auto_set_post_community_id
BEFORE INSERT ON public.posts
FOR EACH ROW
EXECUTE FUNCTION set_post_community_id_from_author();

-- And ensure the existing check trigger is still in place and relevant
-- (Your dump already has "enforce_community_match_trigger")

-- Create an index for faster community-based post filtering
CREATE INDEX IF NOT EXISTS idx_posts_community_id ON posts(community_id);

-- Update RLS policies to include community-based filtering
DROP POLICY IF EXISTS "Community members can view community posts" ON posts;
CREATE POLICY "Community members can view community posts"
ON posts FOR SELECT
USING (
  community_id IN (
    SELECT community_id 
    FROM members 
    WHERE members.id = auth.uid()
  )
);

-- Require post's community_id to match the author's community_id
ALTER TABLE posts ADD CONSTRAINT check_post_community_id_matches_author
CHECK (
  community_id = (
    SELECT community_id 
    FROM members 
    WHERE members.id = author_id
  )
); 