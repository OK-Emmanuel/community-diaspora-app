-- MOST RELIABLE APPROACH: Link existing auth user to members table
-- NOTE: You MUST create the admin user first through the Supabase dashboard or API

-- Replace 'your-admin-email@example.com' with the email you used when creating the user
DO $$
DECLARE
    admin_id UUID;
    admin_email TEXT := 'admin@diaspora.com'; -- CHANGE THIS if you used a different email
BEGIN
    -- Get the UUID of the user from auth.users
    SELECT id INTO admin_id FROM auth.users WHERE email = admin_email;
    
    IF admin_id IS NULL THEN
        RAISE NOTICE 'No user found with email %. Please create this user first in the Supabase dashboard.', admin_email;
        RETURN;
    END IF;
    
    -- Check if user is already in members table
    IF EXISTS (SELECT 1 FROM members WHERE id = admin_id) THEN
        -- Update to ensure admin role
        UPDATE members
        SET role = 'admin', status = 'active'
        WHERE id = admin_id;
        
        RAISE NOTICE 'Existing user updated to admin role. ID: %', admin_id;
    ELSE
        -- Insert into members table
        INSERT INTO members (
            id, 
            first_name, 
            last_name, 
            role, 
            status, 
            email
        ) VALUES (
            admin_id, 
            'Super', 
            'Admin', 
            'admin', 
            'active', 
            admin_email
        );
        
        RAISE NOTICE 'Admin user added to members table. ID: %', admin_id;
    END IF;
    
    -- Ensure the user's email is confirmed in auth.users
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
    WHERE id = admin_id;
    
    RAISE NOTICE 'Setup complete for admin user with ID: %', admin_id;
END $$; 