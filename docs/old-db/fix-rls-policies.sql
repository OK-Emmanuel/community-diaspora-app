-- Migration script to fix RLS policies
-- This script only updates the RLS policies without recreating tables or types

-- Create function to verify if authenticated user is admin
CREATE OR REPLACE FUNCTION auth.is_jwt_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT role = 'admin' FROM members WHERE id = auth.uid());
EXCEPTION
  WHEN OTHERS THEN RETURN false;
END;
$$ language plpgsql;

-- Drop existing problematic policy
DROP POLICY IF EXISTS "Members can insert their own profile" ON members;

-- Create new policy that allows registration
CREATE POLICY "New users can create their profile"
    ON members FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- Ensure RLS is enabled on all tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_financial_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

-- Add policy for members to update their own profile if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE tablename = 'members' 
    AND policyname = 'Members can update own profile'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Members can update own profile"
        ON members FOR UPDATE
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    $policy$;
  END IF;
END
$$; 