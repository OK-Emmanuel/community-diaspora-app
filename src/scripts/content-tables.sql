-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Likes table to track which users have liked which posts
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(post_id, user_id)
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('general', 'financial', 'event', 'emergency')),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS posts_author_id_idx ON posts(author_id);
CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments(post_id);
CREATE INDEX IF NOT EXISTS comments_author_id_idx ON comments(author_id);
CREATE INDEX IF NOT EXISTS likes_post_id_idx ON likes(post_id);
CREATE INDEX IF NOT EXISTS likes_user_id_idx ON likes(user_id);
CREATE INDEX IF NOT EXISTS announcements_author_id_idx ON announcements(author_id);
CREATE INDEX IF NOT EXISTS announcements_type_idx ON announcements(type);
CREATE INDEX IF NOT EXISTS announcements_is_pinned_idx ON announcements(is_pinned);

-- Create trigger function to update post likes count when a like is added or removed
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update post likes count
DROP TRIGGER IF EXISTS update_post_likes_count_trigger ON likes;
CREATE TRIGGER update_post_likes_count_trigger
AFTER INSERT OR DELETE ON likes
FOR EACH ROW
EXECUTE FUNCTION update_post_likes_count();

-- Create trigger function to update post comments count when a comment is added or removed
CREATE OR REPLACE FUNCTION update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update post comments count
DROP TRIGGER IF EXISTS update_post_comments_count_trigger ON comments;
CREATE TRIGGER update_post_comments_count_trigger
AFTER INSERT OR DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_post_comments_count();

-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updating updated_at timestamp
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON announcements
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Row Level Security (RLS) policies for Content Tables

-- Enable RLS on all tables
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Posts policies
-- 1. Anyone authenticated can view posts
CREATE POLICY read_posts ON posts
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 2. Users can create their own posts
CREATE POLICY create_posts ON posts
  FOR INSERT
  WITH CHECK (auth.uid() = author_id);
  
-- 3. Users can update their own posts
CREATE POLICY update_posts ON posts
  FOR UPDATE
  USING (auth.uid() = author_id);

-- 4. Users can delete their own posts, admins can delete any post
CREATE POLICY delete_posts ON posts
  FOR DELETE
  USING (
    auth.uid() = author_id OR 
    EXISTS (
      SELECT 1 FROM members 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Comments policies
-- 1. Anyone authenticated can view comments
CREATE POLICY read_comments ON comments
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 2. Users can create their own comments
CREATE POLICY create_comments ON comments
  FOR INSERT
  WITH CHECK (auth.uid() = author_id);
  
-- 3. Users can update their own comments
CREATE POLICY update_comments ON comments
  FOR UPDATE
  USING (auth.uid() = author_id);

-- 4. Users can delete their own comments, admins can delete any comment
CREATE POLICY delete_comments ON comments
  FOR DELETE
  USING (
    auth.uid() = author_id OR 
    EXISTS (
      SELECT 1 FROM members 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Likes policies
-- 1. Anyone authenticated can view likes
CREATE POLICY read_likes ON likes
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 2. Users can create their own likes
CREATE POLICY create_likes ON likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
  
-- 3. Users can delete their own likes
CREATE POLICY delete_likes ON likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Announcements policies
-- 1. Anyone authenticated can view announcements
CREATE POLICY read_announcements ON announcements
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 2. Only admins can create announcements
CREATE POLICY create_announcements ON announcements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
  
-- 3. Only admins can update announcements
CREATE POLICY update_announcements ON announcements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Only admins can delete announcements
CREATE POLICY delete_announcements ON announcements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM members 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );