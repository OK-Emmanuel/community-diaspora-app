-- Add community_id column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES communities(id);

-- Create an index for faster community-based post filtering
CREATE INDEX IF NOT EXISTS idx_posts_community_id ON posts(community_id);

-- Update existing posts with the author's community_id
UPDATE posts
SET community_id = (
  SELECT community_id 
  FROM members 
  WHERE members.id = posts.author_id
)
WHERE community_id IS NULL;

-- Create a function to automatically set community_id on new posts
CREATE OR REPLACE FUNCTION set_community_id_on_post()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.community_id IS NULL THEN
    NEW.community_id := (
      SELECT community_id 
      FROM members 
      WHERE members.id = NEW.author_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function before insert
DROP TRIGGER IF EXISTS set_community_id_trigger ON posts;
CREATE TRIGGER set_community_id_trigger
BEFORE INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION set_community_id_on_post();

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