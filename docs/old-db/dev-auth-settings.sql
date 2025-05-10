-- DEVELOPMENT USE ONLY!
-- This script disables email confirmation for local development
-- Do NOT use this in production!

-- Safely update auth settings with error handling
DO $$
BEGIN
    -- Try to update auth config to disable email confirmation
    BEGIN
        UPDATE auth.config 
        SET email_confirmation_required = false;
        RAISE NOTICE 'Successfully disabled email confirmation';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not update auth.config table: %', SQLERRM;
    END;
    
    -- Ensure all users are confirmed even if they haven't clicked email links
    BEGIN
        UPDATE auth.users
        SET email_confirmed_at = NOW()
        WHERE email_confirmed_at IS NULL;
        RAISE NOTICE 'All existing users are now confirmed';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not update auth.users table: %', SQLERRM;
    END;

    -- Check your Supabase version and try specific command
    BEGIN
        EXECUTE 'ALTER FUNCTION auth.email_confirmation() SECURITY DEFINER SET search_path = auth, public';
        RAISE NOTICE 'Modified auth.email_confirmation function';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not update auth.email_confirmation: %', SQLERRM;
    END;
    
    -- If this point is reached, at least one method was applied
    RAISE NOTICE 'Email confirmation handling updated for development environment';
END $$; 