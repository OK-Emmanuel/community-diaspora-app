-- 1. Check existing invites (optional - just to see what’s there)
SELECT * FROM community_invites LIMIT 10;

-- 2. Add 'created_by' column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'community_invites' 
        AND column_name = 'created_by'
    ) THEN
        EXECUTE 'ALTER TABLE community_invites ADD COLUMN created_by UUID REFERENCES auth.users(id);';
    END IF;
END $$;

-- 3. Create a test invite manually
INSERT INTO community_invites (community_id, invite_token, expires_at, used, created_by)
SELECT 
    (SELECT id FROM communities ORDER BY created_at ASC LIMIT 1), -- first community
    gen_random_uuid()::TEXT,
    NOW() + INTERVAL '7 days',
    false,
    (SELECT id FROM members WHERE role = 'admin' OR role = 'superadmin' LIMIT 1)
RETURNING *;

-- 4. Create read policy so anyone can read invites (required if using Row Level Security)
-- Drop old policy if it exists first
DROP POLICY IF EXISTS "Anyone can read community_invites with token" ON community_invites;

-- Now create the new policy
CREATE POLICY "Anyone can read community_invites with token"
ON community_invites FOR SELECT
USING (true);

-- Make sure RLS is enabled on the table
ALTER TABLE community_invites ENABLE ROW LEVEL SECURITY;

-- 5. Create a stored procedure to generate invites
CREATE OR REPLACE PROCEDURE create_invite_token(
    community_id_param UUID,
    user_id_param UUID,
    OUT invite_token_out TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  new_token TEXT;
BEGIN
  -- Generate unique invite token
  new_token := gen_random_uuid()::TEXT;

  -- Insert the new invite
  INSERT INTO community_invites (
    community_id,
    invite_token,
    expires_at,
    used,
    created_by
  ) VALUES (
    community_id_param,
    new_token,
    NOW() + INTERVAL '7 days',
    false,
    user_id_param
  );

  -- Return the token
  invite_token_out := new_token;
END;
$$;

-- 6. Test the procedure (will print the token)
DO $$
DECLARE
  test_token TEXT;
  community_id UUID;
  user_id UUID;
BEGIN
  -- Get IDs to use
  SELECT id INTO community_id FROM communities ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO user_id FROM members WHERE role = 'admin' OR role = 'superadmin' LIMIT 1;

  -- Call the stored procedure
  CALL create_invite_token(community_id, user_id, test_token);

  -- Print it
  RAISE NOTICE 'Created invite token: %', test_token;
END $$;

-- 7. See the most recent invites
SELECT * FROM community_invites ORDER BY created_at DESC LIMIT 20;

