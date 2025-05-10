-- Add database functions to help with member retrieval

-- Function to get member by ID - useful alternative to direct SELECT
CREATE OR REPLACE FUNCTION get_member_by_id(member_id UUID)
RETURNS SETOF members AS $$
  SELECT * FROM members WHERE id = member_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Grant execute permission to everyone (authenticated and anon)
GRANT EXECUTE ON FUNCTION get_member_by_id(UUID) TO authenticated, anon;

-- Helper function that can create a member record if missing
CREATE OR REPLACE FUNCTION ensure_member_exists(
  user_id UUID,
  user_email TEXT,
  user_first_name TEXT DEFAULT 'User',
  user_last_name TEXT DEFAULT '',
  user_role TEXT DEFAULT 'financial'
) RETURNS members AS $$
DECLARE
  member_record members;
BEGIN
  -- Try to find existing record
  SELECT * INTO member_record FROM members WHERE id = user_id;
  
  -- If not found, create one
  IF member_record IS NULL THEN
    INSERT INTO members (
      id, 
      email, 
      first_name, 
      last_name, 
      role, 
      status
    ) VALUES (
      user_id,
      user_email,
      user_first_name,
      user_last_name,
      user_role,
      'active'
    )
    RETURNING * INTO member_record;
  END IF;
  
  RETURN member_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to everyone
GRANT EXECUTE ON FUNCTION ensure_member_exists(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon; 