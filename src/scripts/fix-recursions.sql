-- Start transaction
BEGIN;

-- 1. Drop the type if it exists (for idempotency)
DROP TYPE IF EXISTS public.current_user_details_type CASCADE;

-- 2. Define a composite type to hold user details
CREATE TYPE public.current_user_details_type AS (
  user_id uuid,
  user_role public.user_role, -- Make sure 'public.user_role' is correct
  user_community_id uuid
);

-- 3. Function to get current authenticated user's details
CREATE OR REPLACE FUNCTION public.get_current_user_details()
RETURNS public.current_user_details_type
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- IMPORTANT: For security and context
AS $$
DECLARE
  details public.current_user_details_type;
BEGIN
  SELECT
    m.id,
    m.role,
    m.community_id
  INTO details
  FROM public.members m
  WHERE m.id = auth.uid();

  RETURN details;
END;
$$;

-- 4. Drop potentially problematic existing policies on 'members' table
-- (Ensure these are the correct names from your diaspora-policies.csv for 'members' table read access)
DROP POLICY IF EXISTS "Admins can view member profiles in their community" ON public.members;
DROP POLICY IF EXISTS "Members can view other members in their community" ON public.members;
-- Add any other policies on 'members' that do a sub-select on 'members' itself.

-- 5. Recreate policies using the helper function

-- Policy for Admins viewing members in their community
CREATE POLICY "Admins can view member profiles in their community"
ON public.members
FOR SELECT -- Or whatever command type it was (e.g., ALL)
TO authenticated
USING (
  (get_current_user_details()).user_role = 'admin'::public.user_role AND
  (get_current_user_details()).user_community_id = community_id -- This 'community_id' is members.community_id
);

-- Policy for Members viewing other members in their community
CREATE POLICY "Members can view other members in their community"
ON public.members
FOR SELECT -- Or whatever command type it was
TO authenticated
USING (
  (get_current_user_details()).user_community_id = community_id -- This 'community_id' is members.community_id
);

-- Make sure your other SELECT policies on 'members' are still in place and correct:
-- e.g., "Members can view their own full profile" USING (id = auth.uid())
-- e.g., "Superadmins have full control" USING (is_superadmin(auth.uid())) (from previous script)
-- If these were dropped by CASCADE or you want to be sure, re-add them here.
-- For example, if "Superadmins have full control" was named exactly that:
-- DROP POLICY IF EXISTS "Superadmins have full control" ON public.members;
-- CREATE POLICY "Superadmins have full control" ON public.members
-- FOR ALL TO authenticated USING (is_superadmin(auth.uid())) WITH CHECK (is_superadmin(auth.uid()));


-- Commit transaction
COMMIT;
