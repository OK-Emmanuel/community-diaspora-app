-- Fix for functions with mutable search paths
BEGIN;

-- 1. enforce_community_match
CREATE OR REPLACE FUNCTION public.enforce_community_match()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public  -- This is the fix
AS $BODY$
DECLARE
  author_community UUID;
BEGIN
  SELECT community_id INTO author_community
  FROM members
  WHERE id = NEW.author_id;

  IF NEW.community_id IS DISTINCT FROM author_community THEN
    RAISE EXCEPTION 'Post community_id (%) must match author''s community_id (%)',
      NEW.community_id, author_community;
  END IF;

  RETURN NEW;
END;
$BODY$;

-- 2. generate_community_invite
CREATE OR REPLACE FUNCTION public.generate_community_invite(community_id_param uuid, user_id_param uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public  -- This is the fix
AS $BODY$
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
$BODY$;

-- 3. set_post_community_id_from_author
CREATE OR REPLACE FUNCTION public.set_post_community_id_from_author()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public  -- This is the fix
AS $BODY$
BEGIN
  IF NEW.community_id IS NULL THEN
    SELECT community_id INTO NEW.community_id
    FROM public.members
    WHERE id = NEW.author_id;
  END IF;
  RETURN NEW;
END;
$BODY$;

-- 4. get_member_by_id
CREATE OR REPLACE FUNCTION public.get_member_by_id(member_id uuid)
  RETURNS SETOF public.members
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = public  -- This is the fix
AS $BODY$
  SELECT * FROM members WHERE id = member_id;
$BODY$;

-- 5. ensure_member_exists
CREATE OR REPLACE FUNCTION public.ensure_member_exists(user_id uuid, user_email text, user_first_name text='User'::text, user_last_name text=''::text, user_role text='financial'::text)
  RETURNS public.members
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public  -- This is the fix
AS $BODY$
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
$BODY$;

-- 6. set_announcement_community_id_from_author
CREATE OR REPLACE FUNCTION public.set_announcement_community_id_from_author()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public  -- This is the fix
AS $BODY$
BEGIN
  -- Only set community_id if it's not provided and the author is an admin with a community_id
  IF NEW.community_id IS NULL AND NEW.author_id IS NOT NULL THEN
    SELECT m.community_id INTO NEW.community_id
    FROM public.members m
    WHERE m.id = NEW.author_id AND (m.role = 'admin'::user_role OR m.role = 'superadmin'::user_role);
    -- If a superadmin creates an announcement without specifying community_id,
    -- it might remain NULL (global) or take their community_id if they have one.
    -- Application logic should be clear: 'global' means community_id IS NULL.
  END IF;
  RETURN NEW;
END;
$BODY$;

-- 7. set_comment_community_id_from_post
CREATE OR REPLACE FUNCTION public.set_comment_community_id_from_post()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public  -- This is the fix
AS $BODY$
BEGIN
  IF NEW.post_id IS NOT NULL AND NEW.community_id IS NULL THEN
    SELECT p.community_id INTO NEW.community_id
    FROM public.posts p
    WHERE p.id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$BODY$;

-- 8. update_post_likes_count
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public  -- This is the fix
AS $BODY$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$BODY$;

-- 9. update_post_comments_count
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public  -- This is the fix
AS $BODY$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$BODY$;

-- 10. update_modified_column
CREATE OR REPLACE FUNCTION public.update_modified_column()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public  -- This is the fix
AS $BODY$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$BODY$;

-- 11. set_dependent_community_id_from_parent
CREATE OR REPLACE FUNCTION public.set_dependent_community_id_from_parent()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public  -- This is the fix
AS $BODY$
BEGIN
  IF NEW.member_id IS NOT NULL AND NEW.community_id IS NULL THEN
    SELECT m.community_id INTO NEW.community_id
    FROM public.members m
    WHERE m.id = NEW.member_id;
  END IF;
  RETURN NEW;
END;
$BODY$;

-- 12. update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public  -- This is the fix
AS $BODY$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$BODY$;

-- 13. set_like_community_id_from_post
CREATE OR REPLACE FUNCTION public.set_like_community_id_from_post()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = public  -- This is the fix
AS $BODY$
BEGIN
  IF NEW.post_id IS NOT NULL AND NEW.community_id IS NULL THEN
    SELECT p.community_id INTO NEW.community_id
    FROM public.posts p
    WHERE p.id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$BODY$;

COMMIT; 