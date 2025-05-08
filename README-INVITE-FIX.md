# Community Invite Functionality Fix

This document outlines how to fix the community invite functionality that's currently failing with the error:
```
Could not find the function public.generate_community_invite(community_id_param, user_id_param) in the schema cache
```

## Step 1: Add the Missing RPC Function

1. Go to your Supabase dashboard at https://app.supabase.com/
2. Navigate to the SQL Editor
3. Copy and paste the SQL code from `src/scripts/create-invite-function.sql`
4. Run the query to create the function

```sql
-- Create the generate_community_invite function
CREATE OR REPLACE FUNCTION public.generate_community_invite(
  community_id_param UUID,
  user_id_param UUID
)
RETURNS JSONB AS $$
DECLARE
  invite_token TEXT;
  invite_id UUID;
  result JSONB;
BEGIN
  -- Generate a unique invite token (UUID v4)
  invite_token := gen_random_uuid()::TEXT;
  
  -- Insert the invite into the community_invites table
  INSERT INTO community_invites (
    community_id,
    invite_token,
    expires_at,
    used
  ) VALUES (
    community_id_param,
    invite_token,
    NOW() + INTERVAL '7 days', -- Expires in 7 days
    false
  ) RETURNING id INTO invite_id;
  
  -- Create the result JSON
  result := jsonb_build_object(
    'invite_token', invite_token,
    'invite_id', invite_id,
    'community_id', community_id_param,
    'expires_at', (NOW() + INTERVAL '7 days')
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Step 2: Make Sure SQL Migration Has Been Applied

Also make sure the posts table has been updated to include community_id by running the SQL in:
`src/scripts/add-community-to-posts.sql`

## Step 3: Verify Everything Works

1. Try generating an invite link for a community
2. Verify the invite link is created and displayed
3. Copy the invite link and open it in a private/incognito browser window
4. Complete the registration process
5. Log in with the new user account
6. Verify:
   - The user is associated with the correct community
   - The user can only see posts from their community
   - The feed is community-specific

## Troubleshooting

If you still encounter issues:

1. Check the browser console for errors
2. Verify in the Supabase dashboard that the function exists:
   - Go to Database > Functions > search for "generate_community_invite"
3. Check that the community_invites table structure matches what's expected by the function:
   - It should have columns: id, community_id, invite_token, expires_at, used, created_at
4. Ensure the API endpoint fallback is working correctly by checking network requests

## Community-Specific Post Testing

To verify posts are community-specific:
1. Create two different communities
2. Create users in each community
3. Have each user create posts
4. Verify each user only sees posts from their own community 