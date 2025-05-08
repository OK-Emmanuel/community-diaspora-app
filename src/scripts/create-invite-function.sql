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