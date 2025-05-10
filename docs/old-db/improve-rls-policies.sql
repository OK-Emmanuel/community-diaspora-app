-- Comprehensive RLS policy fixes for common issues

-- Fix 1: Ensure public (anonymous) and authenticated users can SELECT from members table
-- This is crucial for login - users must be able to read their own profile
CREATE POLICY IF NOT EXISTS "Anyone can read members"
    ON members FOR SELECT
    USING (true);

-- Fix 2: Allow users to read any member's basic info
CREATE POLICY IF NOT EXISTS "Anyone can read basic member info"
    ON members FOR SELECT 
    USING (true);

-- Fix 3: Add more permissive SELECT policies for all tables needed at login
-- These are essential for the initial app load
DO $$
BEGIN
    -- Posts table
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND operation = 'SELECT'
    ) THEN
        EXECUTE $policy$
            CREATE POLICY "Anyone can read posts"
                ON posts FOR SELECT
                USING (true);
        $policy$;
    END IF;
    
    -- Comments table
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'comments' AND operation = 'SELECT'
    ) THEN
        EXECUTE $policy$
            CREATE POLICY "Anyone can read comments"
                ON comments FOR SELECT
                USING (true);
        $policy$;
    END IF;
    
    -- Announcements table
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'announcements' AND operation = 'SELECT'
    ) THEN
        EXECUTE $policy$
            CREATE POLICY "Anyone can read announcements"
                ON announcements FOR SELECT
                USING (true);
        $policy$;
    END IF;
END $$;

-- Fix 4: Ensure auth.users email_confirmed_at is set for all users
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;

-- Fix 5: Update Supabase auth config
DO $$
BEGIN
    -- Try to access auth config
    BEGIN
        UPDATE auth.config 
        SET email_confirmation_required = false,
            enable_signup = true;
        
        RAISE NOTICE 'Auth config updated successfully';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not update auth.config: %', SQLERRM;
    END;
END $$;

-- Fix 6: Grant public (anon) access to essential tables
DO $$
BEGIN
    EXECUTE 'GRANT SELECT ON public.members TO anon';
    EXECUTE 'GRANT SELECT ON public.posts TO anon';
    EXECUTE 'GRANT SELECT ON public.comments TO anon';
    EXECUTE 'GRANT SELECT ON public.announcements TO anon';
    
    RAISE NOTICE 'Granted anon SELECT permissions on essential tables';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error granting anon permissions: %', SQLERRM;
END $$; 